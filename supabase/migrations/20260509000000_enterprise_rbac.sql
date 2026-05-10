-- Enterprise Multi-tenant and RBAC Schema

-- 1. Table: organizations
create table if not exists public.organizations (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    slug text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table: workspaces
create table if not exists public.workspaces (
    id uuid default uuid_generate_v4() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    name text not null,
    slug text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(organization_id, slug)
);

-- 3. Table: ledgers
create table if not exists public.ledgers (
    id uuid default uuid_generate_v4() primary key,
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    name text not null,
    code text, -- e.g., 'MAIN', 'TAX-2026'
    base_currency text default 'USD' not null,
    timezone text default 'UTC' not null,
    fiscal_year_start date,
    locale text default 'en-US' not null,
    settings jsonb default '{
        "number_formatting": "standard",
        "decimal_precision": 2,
        "accounting_format": "standard",
        "exchange_rate_source": "default"
    }'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Table: roles (System defined roles)
-- Types: 'owner', 'admin', 'accountant', 'auditor', 'viewer'
-- We can use a simple text column for now or a dedicated table if we want custom roles later.

-- 5. Table: ledger_members
create table if not exists public.ledger_members (
    id uuid default uuid_generate_v4() primary key,
    ledger_id uuid references public.ledgers(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text not null check (role in ('owner', 'admin', 'accountant', 'auditor', 'viewer')),
    status text default 'active' not null check (status in ('active', 'suspended', 'pending')),
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(ledger_id, user_id)
);

-- 6. Table: invitations
create table if not exists public.invitations (
    id uuid default uuid_generate_v4() primary key,
    ledger_id uuid references public.ledgers(id) on delete cascade not null,
    inviter_id uuid references public.profiles(id) on delete set null,
    email text not null,
    role text not null check (role in ('admin', 'accountant', 'auditor', 'viewer')),
    token text unique not null,
    expires_at timestamp with time zone not null,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Table: audit_trails
create table if not exists public.audit_trails (
    id uuid default uuid_generate_v4() primary key,
    ledger_id uuid references public.ledgers(id) on delete cascade,
    user_id uuid references public.profiles(id),
    action text not null, -- 'user.create', 'ledger.update', 'member.invite', 'sensitive.delete'
    entity_type text not null, -- 'ledger', 'member', 'transaction'
    entity_id uuid,
    metadata jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Table: device_verifications (Simulated for fintech security)
create table if not exists public.device_verifications (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    device_id text not null,
    device_name text,
    is_trusted boolean default false not null,
    last_login_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update RLS
alter table public.organizations enable row level security;
alter table public.workspaces enable row level security;
alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_trails enable row level security;
alter table public.device_verifications enable row level security;

-- Policies (Simplified for now: members of ledger can see ledger)
create policy "Members can view their ledgers." on public.ledgers
    for select using (
        exists (
            select 1 from public.ledger_members
            where ledger_id = public.ledgers.id and user_id = auth.uid()
        )
    );

create policy "Owners/Admins can update their ledgers." on public.ledgers
    for update using (
        exists (
            select 1 from public.ledger_members
            where ledger_id = public.ledgers.id and user_id = auth.uid() and role in ('owner', 'admin')
        )
    );

-- Ledger Members policies
create policy "Members can view other members in same ledger." on public.ledger_members
    for select using (
        exists (
            select 1 from public.ledger_members as m
            where m.ledger_id = public.ledger_members.ledger_id and m.user_id = auth.uid()
        )
    );

-- Organizations policies
create policy "Users can create organizations." on public.organizations
    for insert with check (auth.uid() is not null);

create policy "Members can view their organizations." on public.organizations
    for select using (
        exists (
            select 1 from public.workspaces w
            join public.ledgers l on l.workspace_id = w.id
            join public.ledger_members lm on lm.ledger_id = l.id
            where w.organization_id = public.organizations.id and lm.user_id = auth.uid()
        )
    );

-- Workspaces policies
create policy "Users can create workspaces." on public.workspaces
    for insert with check (auth.uid() is not null);

create policy "Members can view their workspaces." on public.workspaces
    for select using (
        exists (
            select 1 from public.ledgers l
            join public.ledger_members lm on lm.ledger_id = l.id
            where l.workspace_id = public.workspaces.id and lm.user_id = auth.uid()
        )
    );

-- Triggers for updated_at
create trigger handle_organizations_updated_at before update on public.organizations for each row execute procedure public.handle_updated_at();
create trigger handle_workspaces_updated_at before update on public.workspaces for each row execute procedure public.handle_updated_at();
create trigger handle_ledgers_updated_at before update on public.ledgers for each row execute procedure public.handle_updated_at();
create trigger handle_ledger_members_updated_at before update on public.ledger_members for each row execute procedure public.handle_updated_at();

-- Function to handle auto creation of default ledger for new user
-- Note: This would typically be handled in a more complex setup (Organization -> Workspace -> Ledger)
-- But for the initial flow, we'll create a default org/workspace/ledger.

create or replace function public.initialize_user_financial_space()
returns trigger as $$
declare
    new_org_id uuid;
    new_workspace_id uuid;
    new_ledger_id uuid;
begin
    -- 1. Create default organization
    insert into public.organizations (name, slug)
    values (new.full_name || '''s Organization', 'org-' || new.id)
    returning id into new_org_id;

    -- 2. Create default workspace
    insert into public.workspaces (organization_id, name, slug)
    values (new_org_id, 'Default Workspace', 'default')
    returning id into new_workspace_id;

    -- 3. Create default ledger
    insert into public.ledgers (workspace_id, name, code, base_currency, timezone)
    values (new_workspace_id, 'Main Ledger', 'MAIN', 'USD', 'UTC')
    returning id into new_ledger_id;

    -- 4. Assign user as Owner
    insert into public.ledger_members (ledger_id, user_id, role, status)
    values (new_ledger_id, new.id, 'owner', 'active');

    -- 5. Create initial audit log
    insert into public.audit_trails (ledger_id, user_id, action, entity_type, entity_id, metadata)
    values (new_ledger_id, new.id, 'ledger.create', 'ledger', new_ledger_id, '{"reason": "initialization"}'::jsonb);

    return new;
end;
$$ language plpgsql security definer;

-- We already have on_auth_user_created trigger on public.profiles in 20260506000000_init_schema.sql
-- Let's add this one as well, or modify the existing one.
-- Actually, it's better to add it to public.profiles after insert.
create trigger on_profile_created
    after insert on public.profiles
    for each row execute procedure public.initialize_user_financial_space();
