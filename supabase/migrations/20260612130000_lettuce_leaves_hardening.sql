-- M3 hardening: close economic exploits found in adversarial review of the
-- Lettuce Leaves credit system.

-- FIX 1 (critical): remove the per-completion +10 "swap_bonus".
-- It was an unbounded mint: two colluding accounts could loop
-- accept -> complete on a temporary swap (which recycles the items back to
-- 'available') and harvest +20 🥬 per iteration at zero cost. Completing a
-- swap no longer mints Leaves; the doc's earn routes are invites/community/
-- promotion, not swap completion.
--
-- FIX 2 (high): a Leaves payment must not be reversible by the payer.
-- accepted -> cancelled refunds the buyer and debits the seller; previously
-- either party could trigger it, letting a buyer take the goods then claw the
-- Leaves back. Now only the member who RECEIVED the Leaves (to_user, the
-- seller) may cancel-and-refund an accepted Leaves swap.
--
-- FIX 4 (medium): swap_type and return_by become immutable after insert, and
-- column-level UPDATE is re-revoked so offer identity/price can't be rewritten
-- even if the trigger were dropped (defense-in-depth).

-- Identity immutability + transition rules ----------------------------------
create or replace function public.enforce_offer_update_rules()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- Immutable identity / terms fields
  if new.from_user_id       is distinct from old.from_user_id
     or new.to_user_id      is distinct from old.to_user_id
     or new.offered_item_id is distinct from old.offered_item_id
     or new.requested_item_id is distinct from old.requested_item_id
     or new.leaves_amount   is distinct from old.leaves_amount
     or new.swap_type       is distinct from old.swap_type
     or new.return_by       is distinct from old.return_by then
    raise exception 'offer identity and terms are immutable';
  end if;

  if new.status is distinct from old.status then
    -- Game-mode promotion pending -> accepted from within record_game_like()
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
    -- Either party can complete an accepted offer; cancelling an accepted
    -- Leaves swap (which refunds) is restricted to the Leaves recipient so a
    -- payer can never claw a payment back after receiving the goods.
    elsif old.status = 'accepted' and new.status in ('completed','cancelled') then
      if auth.uid() not in (old.from_user_id, old.to_user_id) then
        raise exception 'only a participant can change this offer status';
      end if;
      if new.status = 'cancelled' and old.leaves_amount is not null
         and auth.uid() <> old.to_user_id then
        raise exception 'only the member who received the Leaves can cancel and refund this swap';
      end if;
    else
      raise exception 'invalid offer status transition from % to %', old.status, new.status;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Side effects: drop the completion mint, keep item lifecycle + Leaves move ----
create or replace function public.apply_offer_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status = 'accepted' and old.status is distinct from 'accepted') then
    if exists (
      select 1 from items i
      where i.id in (new.offered_item_id, new.requested_item_id)
        and i.status <> 'available'
    ) then
      raise exception 'Cannot accept: one of the items is no longer available';
    end if;
    update items set status = 'reserved'
      where id in (new.offered_item_id, new.requested_item_id);

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
      update items set status = 'available'
        where id in (new.offered_item_id, new.requested_item_id)
          and status = 'reserved';
    else
      update items set status = 'swapped'
        where id in (new.offered_item_id, new.requested_item_id);
    end if;
    -- No completion bonus: minting on completion is exploitable (see FIX 1).

  elsif (new.status in ('declined','cancelled') and old.status is distinct from new.status) then
    update items i set status = 'available'
      where i.id in (new.offered_item_id, new.requested_item_id)
        and i.status = 'reserved'
        and not exists (
          select 1 from offers o
          where o.id <> new.id
            and o.status = 'accepted'
            and (o.offered_item_id = i.id or o.requested_item_id = i.id)
        );
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

-- Grant-level immutability: clients may only change an offer's status (and the
-- updated_at the app stamps alongside it; the BEFORE trigger overwrites it).
-- Identity and terms columns can no longer be written from the client at all.
revoke update on public.offers from authenticated;
grant update (status, updated_at) on public.offers to authenticated;
