-- TheBarnInsider production database schema
-- Run once in a brand-new Supabase project.

begin;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  country text,
  state_region text,
  role text not null default 'employee' check (role in ('employee','employer','moderator','admin')),
  account_status text not null default 'active' check (account_status in ('active','suspended','closed')),
  email_verified boolean not null default false,
  public_display_preference text not null default 'anonymous' check (public_display_preference in ('anonymous','first_name','full_name')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.barns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location_city text,
  location_state text,
  location_country text not null default 'United States',
  discipline text,
  website_url text,
  social_url text,
  description text,
  profile_image_url text,
  is_claimed boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index barns_name_location_unique on public.barns (lower(name), lower(coalesce(location_city,'')), lower(coalesce(location_state,'')));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid not null references public.barns(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  public_display text not null default 'anonymous' check (public_display in ('anonymous','first_name','full_name')),
  public_name text not null default 'Anonymous employee',
  job_title text not null,
  employment_status text not null check (employment_status in ('current_employee','former_employee','working_student','intern_apprentice')),
  tenure text not null check (tenure in ('under_3_months','3_6_months','6_12_months','1_2_years','2_5_years','5_plus_years')),
  average_weekly_hours numeric(5,1) check (average_weekly_hours is null or (average_weekly_hours > 0 and average_weekly_hours <= 168)),
  pay_basis text check (pay_basis is null or pay_basis in ('hourly','monthly')),
  pay_amount numeric(12,2) check (pay_amount is null or pay_amount >= 0),
  currency text not null default 'USD',
  housing_arrangement text check (housing_arrangement is null or housing_arrangement in ('not_provided','provided_free','deducted_from_pay','separate_fee','promised_not_provided')),
  rating_overall smallint not null check (rating_overall between 1 and 5),
  rating_pay smallint not null check (rating_pay between 1 and 5),
  rating_management smallint not null check (rating_management between 1 and 5),
  rating_housing smallint check (rating_housing is null or rating_housing between 1 and 5),
  rating_work_life smallint not null check (rating_work_life between 1 and 5),
  rating_horse_care smallint not null check (rating_horse_care between 1 and 5),
  rating_safety smallint not null check (rating_safety between 1 and 5),
  rating_growth smallint not null check (rating_growth between 1 and 5),
  would_work_again boolean,
  headline text not null check (char_length(headline) between 5 and 120),
  experience text not null check (char_length(experience) between 120 and 5000),
  positives text check (positives is null or char_length(positives) <= 1500),
  improvements text check (improvements is null or char_length(improvements) <= 1500),
  contact_permission boolean not null default true,
  proof_available text not null default 'prefer_not_to_say' check (proof_available in ('yes','no','prefer_not_to_say')),
  certified_firsthand boolean not null default false,
  certified_truthful boolean not null default false,
  accepted_policies boolean not null default false,
  status text not null default 'pending' check (status in ('draft','pending','changes_requested','proof_requested','under_review','approved','published','flagged','rejected','removed','withdrawn','archived')),
  employment_verified boolean not null default false,
  moderator_note text,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index reviews_barn_id_idx on public.reviews(barn_id);
create index reviews_reviewer_id_idx on public.reviews(reviewer_id);
create index reviews_status_idx on public.reviews(status);
create index reviews_submitted_at_idx on public.reviews(submitted_at desc);
create index reviews_public_idx on public.reviews(barn_id,published_at desc) where status='published' and deleted_at is null;

create table public.review_versions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique(review_id,version_number)
);

create table public.barn_claims (
  id uuid primary key default gen_random_uuid(),
  barn_id uuid references public.barns(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  barn_name text not null,
  claimant_legal_name text not null,
  role_title text not null,
  business_email text not null,
  business_phone text,
  website_url text,
  explanation text not null,
  authority_certified boolean not null default false,
  response_rules_accepted boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index barn_claims_claimant_idx on public.barn_claims(claimant_id);
create index barn_claims_status_idx on public.barn_claims(status);
create index barn_claims_barn_idx on public.barn_claims(barn_id);

create table public.review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('reviewer_never_worked_here','false_factual_statement','private_information','threats_or_harassment','confidential_information','conflict_or_manipulation','other_policy_violation')),
  challenged_text text,
  details text not null check (char_length(details) >= 30),
  supporting_summary text,
  status text not null default 'open' check (status in ('open','under_review','resolved_no_action','resolved_action_taken','dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index review_flags_review_idx on public.review_flags(review_id);
create index review_flags_status_idx on public.review_flags(status);
create index review_flags_reporter_idx on public.review_flags(reporter_id);

create table public.proof_requests (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  requested_from uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  request_message text not null,
  disputed_statement text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','submitted','sufficient','insufficient','closed','expired')),
  reviewer_response text,
  admin_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  resolved_at timestamptz
);

create index proof_requests_review_idx on public.proof_requests(review_id);
create index proof_requests_user_idx on public.proof_requests(requested_from);
create index proof_requests_status_idx on public.proof_requests(status);

create table public.proof_files (
  id uuid primary key default gen_random_uuid(),
  proof_request_id uuid not null references public.proof_requests(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  description text,
  created_at timestamptz not null default now()
);

create index proof_files_request_idx on public.proof_files(proof_request_id);
create index proof_files_uploader_idx on public.proof_files(uploader_id);

create table public.employer_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  barn_id uuid not null references public.barns(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  response_body text not null check (char_length(response_body) between 30 and 3000),
  status text not null default 'pending' check (status in ('pending','changes_requested','published','rejected','removed')),
  moderator_note text,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(review_id,author_id)
);

create index employer_responses_review_idx on public.employer_responses(review_id);
create index employer_responses_status_idx on public.employer_responses(status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  review_id uuid references public.reviews(id) on delete cascade,
  barn_id uuid references public.barns(id) on delete cascade,
  claim_id uuid references public.barn_claims(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications(user_id,created_at desc);
create index notifications_unread_idx on public.notifications(user_id,is_read) where is_read=false;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(id) on delete cascade,
  claim_id uuid references public.barn_claims(id) on delete cascade,
  response_id uuid references public.employer_responses(id) on delete cascade,
  flag_id uuid references public.review_flags(id) on delete cascade,
  proof_request_id uuid references public.proof_requests(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  previous_status text,
  new_status text,
  internal_note text,
  created_at timestamptz not null default now(),
  check (review_id is not null or claim_id is not null or response_id is not null or flag_id is not null or proof_request_id is not null)
);

create index moderation_actions_review_idx on public.moderation_actions(review_id,created_at desc);
create index moderation_actions_moderator_idx on public.moderation_actions(moderator_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger barns_set_updated_at before update on public.barns for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger employer_responses_set_updated_at before update on public.employer_responses for each row execute function public.set_updated_at();

create or replace function public.is_admin_or_moderator() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','moderator') and account_status='active'); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and account_status='active'); $$;
create or replace function public.can_manage_barn(target_barn_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.is_admin_or_moderator() or exists(select 1 from public.barn_claims where barn_id=target_barn_id and claimant_id=auth.uid() and status='approved'); $$;

grant execute on function public.is_admin_or_moderator() to anon,authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.can_manage_barn(uuid) to anon,authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,first_name,last_name,phone,country,state_region,email_verified)
  values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'phone',''),nullif(new.raw_user_meta_data->>'country',''),nullif(new.raw_user_meta_data->>'state_region',''),new.email_confirmed_at is not null)
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.sync_email_verification() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.profiles set email_verified=(new.email_confirmed_at is not null) where id=new.id; return new; end; $$;
drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified after update of email_confirmed_at on auth.users for each row execute function public.sync_email_verification();

create or replace function public.protect_profile_privileges() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and auth.uid()=old.id and not public.is_admin() then
    if new.role is distinct from old.role or new.account_status is distinct from old.account_status or new.email_verified is distinct from old.email_verified then
      raise exception 'You may not modify protected account fields.';
    end if;
  end if;
  return new;
end; $$;
create trigger profiles_protect_privileges before update on public.profiles for each row execute function public.protect_profile_privileges();

create or replace function public.prepare_review_insert() returns trigger language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select * into p from public.profiles where id=auth.uid();
  if p.account_status<>'active' then raise exception 'This account may not submit reviews.'; end if;
  if not coalesce(new.certified_firsthand,false) or not coalesce(new.certified_truthful,false) or not coalesce(new.accepted_policies,false) then raise exception 'Required review certifications are missing.'; end if;
  new.reviewer_id:=auth.uid(); new.status:='pending'; new.employment_verified:=false; new.published_at:=null; new.removed_at:=null; new.moderator_note:=null; new.rejection_reason:=null; new.deleted_at:=null;
  if new.public_display='full_name' then new.public_name:=trim(p.first_name||' '||p.last_name);
  elsif new.public_display='first_name' then new.public_name:=coalesce(nullif(p.first_name,''),'Anonymous employee');
  else new.public_name:='Anonymous employee'; end if;
  return new;
end; $$;
create trigger reviews_prepare_insert before insert on public.reviews for each row execute function public.prepare_review_insert();

create or replace function public.protect_review_moderation_fields() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and auth.uid()=old.reviewer_id and not public.is_admin_or_moderator() then
    if old.status not in ('draft','pending','changes_requested') then raise exception 'This review can no longer be edited by the reviewer.'; end if;
    new.reviewer_id:=old.reviewer_id; new.status:=old.status; new.employment_verified:=old.employment_verified; new.moderator_note:=old.moderator_note; new.rejection_reason:=old.rejection_reason; new.published_at:=old.published_at; new.removed_at:=old.removed_at; new.deleted_at:=old.deleted_at;
  end if;
  return new;
end; $$;
create trigger reviews_protect_moderation before update on public.reviews for each row execute function public.protect_review_moderation_fields();

create or replace function public.capture_review_version() returns trigger language plpgsql security definer set search_path=public as $$
declare next_version integer;
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    select coalesce(max(version_number),0)+1 into next_version from public.review_versions where review_id=old.id;
    insert into public.review_versions(review_id,version_number,snapshot,changed_by,change_reason) values(old.id,next_version,to_jsonb(old),auth.uid(),'Review updated');
  end if;
  return new;
end; $$;
create trigger reviews_capture_version after update on public.reviews for each row execute function public.capture_review_version();

create or replace function public.notify_admins_new_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,type,title,message,review_id,barn_id)
  select id,'pending_review','New review awaiting moderation','A new employee review has been submitted and requires moderation.',new.id,new.barn_id
  from public.profiles where role in ('admin','moderator') and account_status='active';
  return new;
end; $$;
create trigger reviews_notify_admins after insert on public.reviews for each row execute function public.notify_admins_new_review();

create or replace function public.notify_reviewer_status_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(user_id,type,title,message,review_id,barn_id) values(new.reviewer_id,'review_status','Your review status changed','Your review is now marked as: '||replace(new.status,'_',' ')||'.',new.id,new.barn_id);
  end if;
  return new;
end; $$;
create trigger reviews_notify_reviewer after update of status on public.reviews for each row execute function public.notify_reviewer_status_change();

create or replace function public.sync_barn_claim_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='approved' and old.status is distinct from new.status then
    update public.barns set is_claimed=true where id=new.barn_id;
    update public.profiles set role=case when role='employee' then 'employer' else role end where id=new.claimant_id;
  end if;
  return new;
end; $$;
create trigger barn_claims_sync_approval after update of status on public.barn_claims for each row execute function public.sync_barn_claim_status();

alter table public.profiles enable row level security;
alter table public.barns enable row level security;
alter table public.reviews enable row level security;
alter table public.review_versions enable row level security;
alter table public.barn_claims enable row level security;
alter table public.review_flags enable row level security;
alter table public.proof_requests enable row level security;
alter table public.proof_files enable row level security;
alter table public.employer_responses enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_actions enable row level security;

create policy "Users can read their own profile" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin_or_moderator());
create policy "Users can update their own profile" on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());

create policy "Anyone can read active barns" on public.barns for select to anon,authenticated using(is_active=true or public.is_admin_or_moderator());
create policy "Authenticated users can suggest barns" on public.barns for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and account_status='active'));
create policy "Approved claimants can update barns" on public.barns for update to authenticated using(public.can_manage_barn(id)) with check(public.can_manage_barn(id));

create policy "Public can read published reviews" on public.reviews for select to anon,authenticated using((status='published' and deleted_at is null) or reviewer_id=auth.uid() or public.is_admin_or_moderator());
create policy "Authenticated users can submit reviews" on public.reviews for insert to authenticated with check(reviewer_id=auth.uid());
create policy "Reviewers can edit eligible own reviews" on public.reviews for update to authenticated using(reviewer_id=auth.uid() or public.is_admin_or_moderator()) with check(reviewer_id=auth.uid() or public.is_admin_or_moderator());

create policy "Reviewers and moderators can read review history" on public.review_versions for select to authenticated using(public.is_admin_or_moderator() or exists(select 1 from public.reviews where reviews.id=review_versions.review_id and reviews.reviewer_id=auth.uid()));

create policy "Users can read own claims" on public.barn_claims for select to authenticated using(claimant_id=auth.uid() or public.is_admin_or_moderator());
create policy "Authenticated users can submit claims" on public.barn_claims for insert to authenticated with check(claimant_id=auth.uid() and authority_certified=true and response_rules_accepted=true);
create policy "Moderators can update claims" on public.barn_claims for update to authenticated using(public.is_admin_or_moderator()) with check(public.is_admin_or_moderator());

create policy "Users can read own reports" on public.review_flags for select to authenticated using(reporter_id=auth.uid() or public.is_admin_or_moderator());
create policy "Authenticated users can report reviews" on public.review_flags for insert to authenticated with check(reporter_id=auth.uid());
create policy "Moderators can update reports" on public.review_flags for update to authenticated using(public.is_admin_or_moderator()) with check(public.is_admin_or_moderator());

create policy "Relevant users can read proof requests" on public.proof_requests for select to authenticated using(requested_from=auth.uid() or requested_by=auth.uid() or public.is_admin_or_moderator());
create policy "Moderators can create proof requests" on public.proof_requests for insert to authenticated with check(public.is_admin_or_moderator() and requested_by=auth.uid());
create policy "Relevant users can update proof requests" on public.proof_requests for update to authenticated using(requested_from=auth.uid() or public.is_admin_or_moderator()) with check(requested_from=auth.uid() or public.is_admin_or_moderator());

create policy "Relevant users can read proof file records" on public.proof_files for select to authenticated using(uploader_id=auth.uid() or public.is_admin_or_moderator());
create policy "Requested reviewers can register proof files" on public.proof_files for insert to authenticated with check(uploader_id=auth.uid() and exists(select 1 from public.proof_requests where proof_requests.id=proof_files.proof_request_id and proof_requests.requested_from=auth.uid() and proof_requests.status in ('open','submitted')));
create policy "Uploaders can delete own proof file records" on public.proof_files for delete to authenticated using(uploader_id=auth.uid() or public.is_admin_or_moderator());

create policy "Public can read published employer responses" on public.employer_responses for select to anon,authenticated using(status='published' or author_id=auth.uid() or public.is_admin_or_moderator());
create policy "Approved claimants can submit responses" on public.employer_responses for insert to authenticated with check(author_id=auth.uid() and public.can_manage_barn(barn_id));
create policy "Authors can edit pending responses" on public.employer_responses for update to authenticated using((author_id=auth.uid() and status in ('pending','changes_requested')) or public.is_admin_or_moderator()) with check(author_id=auth.uid() or public.is_admin_or_moderator());

create policy "Users can read own notifications" on public.notifications for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "Users can mark own notifications read" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy "Moderators can read moderation actions" on public.moderation_actions for select to authenticated using(public.is_admin_or_moderator());
create policy "Moderators can create moderation actions" on public.moderation_actions for insert to authenticated with check(public.is_admin_or_moderator() and moderator_id=auth.uid());

grant usage on schema public to anon,authenticated;
grant select on public.barns to anon,authenticated;
grant select on public.reviews to anon,authenticated;
grant select on public.employer_responses to anon,authenticated;
grant select,update on public.profiles to authenticated;
grant insert,update on public.barns to authenticated;
grant insert,update on public.reviews to authenticated;
grant select on public.review_versions to authenticated;
grant select,insert,update on public.barn_claims to authenticated;
grant select,insert,update on public.review_flags to authenticated;
grant select,insert,update on public.proof_requests to authenticated;
grant select,insert,delete on public.proof_files to authenticated;
grant insert,update on public.employer_responses to authenticated;
grant select,update on public.notifications to authenticated;
grant select,insert on public.moderation_actions to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('review-proof','review-proof',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Users can upload proof into own folder" on storage.objects for insert to authenticated with check(bucket_id='review-proof' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users can read own proof files" on storage.objects for select to authenticated using(bucket_id='review-proof' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin_or_moderator()));
create policy "Users can delete own proof files" on storage.objects for delete to authenticated using(bucket_id='review-proof' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin_or_moderator()));

commit;
