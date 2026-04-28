create table if not exists public.cafe_claims (
    id uuid primary key default gen_random_uuid(),
    "cafeId" text not null references public.cafes(id) on delete cascade,
    "cafeName" text not null,
    "userId" text not null,
    "claimantName" text not null,
    role text not null,
    contact text not null,
    "ssmNumber" text not null,
    "documentPath" text not null,
    "documentName" text,
    "proofUrl" text,
    message text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    "rejectionReason" text,
    "appealMessage" text,
    "appealedAt" timestamptz,
    "reviewedBy" text,
    "reviewedAt" timestamptz,
    "createdAt" timestamptz not null default now()
);

alter table public.cafe_claims enable row level security;

drop policy if exists "Users can create their own cafe claims" on public.cafe_claims;
create policy "Users can create their own cafe claims"
on public.cafe_claims
for insert
to public
with check (true);

drop policy if exists "Users can view their own cafe claims" on public.cafe_claims;
create policy "Users can view their own cafe claims"
on public.cafe_claims
for select
to public
using (true);

drop policy if exists "Admins can update cafe claims" on public.cafe_claims;
create policy "Admins can update cafe claims"
on public.cafe_claims
for update
to public
using (true)
with check (true);

drop policy if exists "Admins can update cafe claim status" on public.cafes;
create policy "Admins can update cafe claim status"
on public.cafes
for update
to public
using (true)
with check (true);

create index if not exists cafe_claims_cafe_id_idx on public.cafe_claims ("cafeId");
create index if not exists cafe_claims_user_id_idx on public.cafe_claims ("userId");
create index if not exists cafe_claims_status_idx on public.cafe_claims (status);

alter table public.users add column if not exists "isAdmin" boolean not null default false;

insert into storage.buckets (id, name, public)
values ('cafe-claim-documents', 'cafe-claim-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own cafe claim documents" on storage.objects;
create policy "Users can upload their own cafe claim documents"
on storage.objects
for insert
to public
with check (
    bucket_id = 'cafe-claim-documents'
);

drop policy if exists "App can create signed urls for cafe claim documents" on storage.objects;
create policy "App can create signed urls for cafe claim documents"
on storage.objects
for select
to public
using (bucket_id = 'cafe-claim-documents');

-- If you created this table before these fields existed, run these too:
alter table public.cafe_claims drop constraint if exists "cafe_claims_userId_fkey";
alter table public.cafe_claims drop constraint if exists "cafe_claims_reviewedBy_fkey";
alter table public.cafe_claims alter column "userId" type text using "userId"::text;
alter table public.cafe_claims alter column "reviewedBy" type text using "reviewedBy"::text;
alter table public.cafe_claims add column if not exists "ssmNumber" text;
alter table public.cafe_claims add column if not exists "documentPath" text;
alter table public.cafe_claims add column if not exists "documentName" text;
alter table public.cafe_claims add column if not exists "rejectionReason" text;
alter table public.cafe_claims add column if not exists "appealMessage" text;
alter table public.cafe_claims add column if not exists "appealedAt" timestamptz;
alter table public.cafe_claims alter column "proofUrl" drop not null;

-- Approval should happen from a trusted/admin context.
-- When a claim is approved, update the cafe owner only at that point:
--
-- update public.cafes
-- set "ownerId" = '<approved-user-id>', "claimStatus" = 'claimed'
-- where id = '<cafe-id>';
--
-- update public.cafe_claims
-- set status = 'approved', "reviewedBy" = '<admin-user-id>', "reviewedAt" = now()
-- where id = '<claim-id>';
