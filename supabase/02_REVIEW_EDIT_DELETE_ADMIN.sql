-- Run this once in Supabase SQL Editor after the original production schema.
begin;

-- Permit review owners to revise eligible submissions. Any substantive owner edit
-- automatically returns the review to pending moderation. Owners may also withdraw
-- their own review at any time, which immediately removes it from public view.
create or replace function public.protect_review_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if auth.uid() is not null
     and auth.uid() = old.reviewer_id
     and not public.is_admin_or_moderator()
  then
    new.reviewer_id := old.reviewer_id;
    new.employment_verified := old.employment_verified;

    select * into p from public.profiles where id = auth.uid();
    if new.public_display = 'full_name' then
      new.public_name := trim(p.first_name || ' ' || p.last_name);
    elsif new.public_display = 'first_name' then
      new.public_name := coalesce(nullif(p.first_name, ''), 'Anonymous employee');
    else
      new.public_name := 'Anonymous employee';
    end if;

    if new.status = 'withdrawn' then
      new.status := 'withdrawn';
      new.deleted_at := coalesce(new.deleted_at, now());
      new.published_at := null;
      new.removed_at := null;
      new.moderator_note := null;
      new.rejection_reason := null;
      return new;
    end if;

    if old.status not in ('draft', 'pending', 'changes_requested', 'published', 'proof_requested') then
      raise exception 'This review cannot currently be edited by the reviewer.';
    end if;

    -- Every owner edit requires fresh moderation before it can be public again.
    new.status := 'pending';
    new.published_at := null;
    new.removed_at := null;
    new.deleted_at := null;
    new.moderator_note := null;
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

commit;
