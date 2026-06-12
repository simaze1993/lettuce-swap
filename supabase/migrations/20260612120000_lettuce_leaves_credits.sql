-- M3: Lettuce Leaves 🥬 — earn-only in-app credits.
--
-- Leaves are an app-specific currency with value only inside Lettuce Swap:
-- no purchase for money in this version, and conversion of Leaves to money is
-- never permitted. Users earn Leaves (welcome/invite/community/swap bonuses)
-- and can offer Leaves for an item instead of one of their own items.
-- The ledger is the source of truth; balances change only through the
-- SECURITY DEFINER bookkeeping function below — never directly by clients.

-- 1) Ledger entry kinds -------------------------------------------------------
create type public.leaf_entry_kind as enum (
  'signup_bonus',    -- welcome Leaves on joining
  'invite_bonus',    -- inviting a new member / joining with a code
  'community_bonus', -- creating or managing a community (granted manually)
  'promo_bonus',     -- promoting the app, events (granted manually)
  'swap_payment',    -- Leaves paid for an accepted swap (negative)
  'swap_income',     -- Leaves received for an accepted swap (positive)
  'swap_refund',     -- reversal when an accepted leaves swap is cancelled
  'swap_bonus',      -- small thank-you for every completed swap
  'adjustment'       -- manual correction (service role only)
);

-- 2) Accounts & ledger --------------------------------------------------------
create table public.leaves_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.leaves_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null check (delta <> 0),
  kind public.leaf_entry_kind not null,
  offer_id uuid references public.offers(id) on delete set null,
  counterparty_id uuid references public.profiles(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index leaves_ledger_user_created_idx
  on public.leaves_ledger (user_id, created_at desc);

alter table public.leaves_accounts enable row level security;
alter table public.leaves_ledger enable row level security;

create policy leaves_accounts_select_own
  on public.leaves_accounts for select using (auth.uid() = user_id);
create policy leaves_ledger_select_own
  on public.leaves_ledger for select using (auth.uid() = user_id);

-- Clients are read-only; every write goes through leaves_apply().
revoke all on public.leaves_accounts from anon, authenticated;
revoke all on public.leaves_ledger from anon, authenticated;
grant select on public.leaves_accounts to authenticated;
grant select on public.leaves_ledger to authenticated;

-- 3) Internal bookkeeping -----------------------------------------------------
create or replace function public.leaves_apply(
  p_user uuid,
  p_delta integer,
  p_kind public.leaf_entry_kind,
  p_offer uuid default null,
  p_counterparty uuid default null,
  p_note text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta = 0 then
    return;
  end if;
  insert into leaves_accounts (user_id) values (p_user)
  on conflict (user_id) do nothing;
  update leaves_accounts
     set balance = balance + p_delta, updated_at = now()
   where user_id = p_user;
  insert into leaves_ledger (user_id, delta, kind, offer_id, counterparty_id, note)
  values (p_user, p_delta, p_kind, p_offer, p_counterparty, p_note);
end;
$$;
revoke execute on function
  public.leaves_apply(uuid, integer, public.leaf_entry_kind, uuid, uuid, text)
  from public, anon, authenticated;

-- 4) Welcome bonus ------------------------------------------------------------
create or replace function public.handle_new_profile_leaves()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform leaves_apply(new.id, 50, 'signup_bonus', null, null, 'Welcome to Lettuce Swap');
  return new;
end;
$$;
revoke execute on function public.handle_new_profile_leaves()
  from public, anon, authenticated;

create trigger profiles_grant_signup_leaves
  after insert on public.profiles
  for each row execute function public.handle_new_profile_leaves();

-- Backfill existing members with the welcome bonus.
do $$
declare r record;
begin
  for r in
    select p.id from profiles p
    where not exists (select 1 from leaves_accounts a where a.user_id = p.id)
  loop
    perform leaves_apply(r.id, 50, 'signup_bonus', null, null, 'Welcome to Lettuce Swap');
  end loop;
end;
$$;

-- 5) Invite codes ---------------------------------------------------------------
-- No column grants for clients: like lat/lng/postcode these stay private and
-- are read by the owner via get_my_profile(); they are written only here.
alter table public.profiles
  add column if not exists referral_code text not null unique
    default encode(gen_random_bytes(4), 'hex'),
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create or replace function public.redeem_referral_code(p_code text)
returns integer -- caller's new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_inviter uuid;
  v_rows integer;
  v_balance integer;
begin
  if v_caller is null then
    raise exception 'Sign in to redeem an invite code';
  end if;
  select id into v_inviter from profiles where referral_code = lower(trim(p_code));
  if v_inviter is null then
    raise exception 'Invalid invite code';
  end if;
  if v_inviter = v_caller then
    raise exception 'You cannot redeem your own invite code';
  end if;
  update profiles set referred_by = v_inviter
   where id = v_caller and referred_by is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'You have already used an invite code';
  end if;
  perform leaves_apply(v_inviter, 100, 'invite_bonus', null, v_caller, 'Invited a new member');
  perform leaves_apply(v_caller, 25, 'invite_bonus', null, v_inviter, 'Joined with an invite code');
  select balance into v_balance from leaves_accounts where user_id = v_caller;
  return v_balance;
end;
$$;
revoke execute on function public.redeem_referral_code(text) from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;

-- 6) Offers can be paid in Leaves ----------------------------------------------
-- An offer carries exactly one consideration: one of the sender's items
-- (as before) or an amount of Leaves chosen by the sender — owners never
-- price their own items.
alter table public.offers alter column offered_item_id drop not null;
alter table public.offers
  add column if not exists leaves_amount integer check (leaves_amount > 0);
alter table public.offers
  add constraint offers_exactly_one_consideration
  check (num_nonnulls(offered_item_id, leaves_amount) = 1);

drop policy offers_insert_sender on public.offers;
create policy offers_insert_sender on public.offers for insert
with check (
  auth.uid() = from_user_id
  and auth.uid() <> to_user_id
  and exists (
    select 1 from items i
    where i.id = offers.requested_item_id
      and i.owner_id = offers.to_user_id
      and i.status = 'available'
  )
  and (
    (
      offered_item_id is not null
      and leaves_amount is null
      and exists (
        select 1 from items i
        where i.id = offers.offered_item_id
          and i.owner_id = auth.uid()
          and i.status = 'available'
      )
    )
    or (
      offered_item_id is null
      and leaves_amount is not null
      and leaves_amount <= coalesce(
        (select a.balance from leaves_accounts a where a.user_id = auth.uid()), 0)
    )
  )
);

-- leaves_amount joins the immutable identity fields.
create or replace function public.enforce_offer_update_rules()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- Immutable identity fields
  if new.from_user_id      is distinct from old.from_user_id
     or new.to_user_id     is distinct from old.to_user_id
     or new.offered_item_id is distinct from old.offered_item_id
     or new.requested_item_id is distinct from old.requested_item_id
     or new.leaves_amount  is distinct from old.leaves_amount then
    raise exception 'offer identity fields are immutable';
  end if;

  -- Status transition rules
  if new.status is distinct from old.status then
    -- Allow game-mode promotion pending -> accepted from within record_game_like()
    if old.status = 'pending'
       and new.status = 'accepted'
       and current_setting('app.allow_game_match', true) = 'on' then
      null;
    -- Only the recipient may accept or decline a pending offer
    elsif old.status = 'pending' and new.status in ('accepted','declined') then
      if auth.uid() <> old.to_user_id then
        raise exception 'only the recipient can accept or decline a pending offer';
      end if;
    -- The sender may withdraw their own pending offer
    elsif old.status = 'pending' and new.status = 'cancelled' then
      if auth.uid() <> old.from_user_id then
        raise exception 'only the sender can withdraw a pending offer';
      end if;
    -- Either party can mark an accepted offer as completed or cancelled
    elsif old.status = 'accepted' and new.status in ('completed','cancelled') then
      if auth.uid() not in (old.from_user_id, old.to_user_id) then
        raise exception 'only a participant can change this offer status';
      end if;
    else
      raise exception 'invalid offer status transition from % to %', old.status, new.status;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- 7) Side effects: item lifecycle + Leaves movements ---------------------------
create or replace function public.apply_offer_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status = 'accepted' and old.status is distinct from 'accepted') then
    -- Prevent double-allocating an item across two accepted offers.
    if exists (
      select 1 from items i
      where i.id in (new.offered_item_id, new.requested_item_id)
        and i.status <> 'available'
    ) then
      raise exception 'Cannot accept: one of the items is no longer available';
    end if;
    update items set status = 'reserved'
      where id in (new.offered_item_id, new.requested_item_id);

    -- Leaves offers: the payment moves when the offer is accepted.
    if new.leaves_amount is not null then
      begin
        perform leaves_apply(new.from_user_id, -new.leaves_amount, 'swap_payment',
                             new.id, new.to_user_id, 'Paid for accepted swap');
      exception when check_violation then
        raise exception 'Not enough Leaves to cover this offer (% 🥬 needed)', new.leaves_amount;
      end;
      perform leaves_apply(new.to_user_id, new.leaves_amount, 'swap_income',
                           new.id, new.from_user_id, 'Received for accepted swap');
    end if;

  elsif (new.status = 'completed' and old.status is distinct from 'completed') then
    if new.swap_type = 'temporary' then
      -- Loan concluded: items return to circulation.
      update items set status = 'available'
        where id in (new.offered_item_id, new.requested_item_id)
          and status = 'reserved';
    else
      update items set status = 'swapped'
        where id in (new.offered_item_id, new.requested_item_id);
    end if;
    -- Every completed swap earns both members a small thank-you.
    perform leaves_apply(new.from_user_id, 10, 'swap_bonus',
                         new.id, new.to_user_id, 'Completed swap');
    perform leaves_apply(new.to_user_id, 10, 'swap_bonus',
                         new.id, new.from_user_id, 'Completed swap');

  elsif (new.status in ('declined','cancelled') and old.status is distinct from new.status) then
    -- Release items this offer was holding, unless another accepted offer holds them.
    update items i set status = 'available'
      where i.id in (new.offered_item_id, new.requested_item_id)
        and i.status = 'reserved'
        and not exists (
          select 1 from offers o
          where o.id <> new.id
            and o.status = 'accepted'
            and (o.offered_item_id = i.id or o.requested_item_id = i.id)
        );
    -- Cancelling an accepted leaves swap returns the payment.
    if old.status = 'accepted' and new.status = 'cancelled' and new.leaves_amount is not null then
      begin
        perform leaves_apply(new.to_user_id, -new.leaves_amount, 'swap_refund',
                             new.id, new.from_user_id, 'Refund for cancelled swap');
      exception when check_violation then
        raise exception 'Cannot cancel: the received Leaves were already spent';
      end;
      perform leaves_apply(new.from_user_id, new.leaves_amount, 'swap_refund',
                           new.id, new.to_user_id, 'Refund for cancelled swap');
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.apply_offer_side_effects() from public, anon, authenticated;
