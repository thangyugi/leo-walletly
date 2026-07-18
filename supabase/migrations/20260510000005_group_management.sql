-- Enterprise Group Management Platform (v2)
-- Architecture: Reconciliation-first, Audit-ready, Unlimited Hierarchy

-- Enable ltree for performance hierarchy
create extension if not exists ltree;

-- 1. Enums for Financial Domain
do $$ begin
    create type public.group_type as enum (
        'organization', 'department', 'team', 'project', 'shared', 'financial', 'temporary'
    );
    create type public.reconciliation_mode as enum ('strict', 'balanced', 'manual');
    create type public.currency_policy as enum ('workspace-default', 'group-fixed', 'multi-currency');
    create type public.group_status as enum ('active', 'archived', 'locked', 'suspended');
    create type public.membership_role as enum ('owner', 'finance-admin', 'auditor', 'manager', 'operator', 'viewer');
    create type public.permission_source as enum ('direct', 'inherited', 'workspace', 'organization');
exception
    when duplicate_object then null;
end $$;

-- 2. Refined Groups Table
create table if not exists public.groups (
    id uuid default uuid_generate_v4() primary key,
    parent_id uuid references public.groups(id) on delete cascade,
    
    organization_id uuid references public.organizations(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    
    code text not null,
    name jsonb not null, -- { "en": "...", "ja": "...", "vi": "..." }
    description jsonb,
    
    level integer default 0 not null,
    path ltree not null,
    
    group_type public.group_type default 'team' not null,
    reconciliation_mode public.reconciliation_mode default 'balanced' not null,
    currency_policy public.currency_policy default 'workspace-default' not null,
    status public.group_status default 'active' not null,
    
    metadata jsonb default '{}'::jsonb,
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(workspace_id, code)
);

-- Index for path-based lookups
create index if not exists groups_path_idx on public.groups using gist(path);
create index if not exists groups_parent_id_idx on public.groups(parent_id);

-- 3. Group Ledgers (Many-to-Many)
create table if not exists public.group_ledgers (
    group_id uuid references public.groups(id) on delete cascade not null,
    ledger_id uuid references public.ledgers(id) on delete cascade not null,
    primary key (group_id, ledger_id)
);

-- 4. Group Memberships
create table if not exists public.group_memberships (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references public.groups(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    
    role public.membership_role not null,
    permission_source public.permission_source default 'direct' not null,
    inherited_from uuid references public.groups(id) on delete set null,
    
    permissions text[] default array[]::text[],
    status text default 'active' not null,
    
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(group_id, user_id)
);

-- 5. Link Transactions to Groups
alter table public.transactions add column if not exists group_id uuid references public.groups(id) on delete set null;

-- 6. RLS Policies (Staff-Level RBAC)
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.group_ledgers enable row level security;

-- Policy: Users can view groups they are members of, or groups in their workspace if they have workspace-level access
create policy "Users can view groups via membership." on public.groups
    for select using (
        exists (
            select 1 from public.group_memberships
            where group_id = public.groups.id and user_id = auth.uid()
        ) or exists (
            select 1 from public.ledger_members lm
            join public.ledgers l on l.id = lm.ledger_id
            where l.workspace_id = public.groups.workspace_id and lm.user_id = auth.uid()
        )
    );

-- 7. Functions for Hierarchy Management
create or replace function public.update_group_path()
returns trigger as $$
declare
    parent_path ltree;
begin
    if new.parent_id is null then
        new.path = new.code::ltree;
        new.level = 0;
    else
        select path, level into parent_path, new.level from public.groups where id = new.parent_id;
        new.path = parent_path || new.code::ltree;
        new.level = new.level + 1;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_update_group_path 
before insert or update of parent_id, code on public.groups
for each row execute procedure public.update_group_path();

-- 8. View for Reconciliation Health
create or replace view public.group_reconciliation_summary as
select 
    g.id as group_id,
    g.name,
    g.reconciliation_mode,
    count(t.id) as txn_count,
    sum(case when t.type = 'income' then t.amount else -t.amount end) as net_balance,
    exists (
        select 1 from public.transactions t2
        where t2.group_id = g.id
    ) as has_issues
from public.groups g
left join public.transactions t on t.group_id = g.id
group by g.id, g.name, g.reconciliation_mode;
