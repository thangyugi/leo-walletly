-- Migration: Add missing organization_members table
-- Using gen_random_uuid() for better compatibility with Supabase PG 15+

-- Ensure extensions are available
create extension if not exists "uuid-ossp";

create table if not exists public.organization_members (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text not null check (role in ('owner', 'admin', 'member')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(organization_id, user_id)
);

-- Enable RLS
alter table public.organization_members enable row level security;

-- Policies
drop policy if exists "Members can view their own org memberships." on public.organization_members;
create policy "Members can view their own org memberships." on public.organization_members
    for select using (user_id = auth.uid() or organization_id in (
        select organization_id from organization_members where user_id = auth.uid() and role in ('owner', 'admin')
    ));

-- Backfill organization_members from ledger_members
insert into public.organization_members (organization_id, user_id, role)
select distinct w.organization_id, lm.user_id, 
  case when lm.role = 'owner' then 'owner'::text else 'admin'::text end
from public.ledger_members lm
join public.ledgers l on l.id = lm.ledger_id
join public.workspaces w on w.id = l.workspace_id
on conflict (organization_id, user_id) do nothing;
