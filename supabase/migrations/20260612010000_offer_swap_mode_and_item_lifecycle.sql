-- Offer-level swap mode (temporary loan vs definitive) + agreed return date,
-- and an item-status lifecycle driven by offer progression.

-- 1) New columns on offers --------------------------------------------------
alter table public.offers
  add column if not exists swap_type public.swap_type not null default 'definitive',
  add column if not exists return_by date;

-- A definitive swap never carries a return date.
alter table public.offers drop constraint if exists offers_return_by_temporary_only;
alter table public.offers
  add constraint offers_return_by_temporary_only
  check (swap_type = 'temporary' or return_by is null);

comment on column public.offers.swap_type is
  'Mode agreed for THIS swap: definitive (permanent) or temporary (loan).';
comment on column public.offers.return_by is
  'For temporary loans: the date the items are due back. NULL for definitive.';

-- 2) Item-status side effects ----------------------------------------------
-- SECURITY DEFINER: accepting an offer must reserve the *other* party's item,
-- which items_update_own RLS would otherwise forbid.
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
  end if;

  return new;
end;
$$;

drop trigger if exists offers_apply_side_effects on public.offers;
create trigger offers_apply_side_effects
  after update on public.offers
  for each row execute function public.apply_offer_side_effects();

-- This is a trigger-only function; it must never be callable directly via the
-- REST RPC endpoint. The trigger still fires regardless of these grants.
revoke execute on function public.apply_offer_side_effects() from public, anon, authenticated;
