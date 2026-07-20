-- Foundation table 2/18: members
-- docs/database/01_foundation_schema.html#members
--
-- Resolves the N-N relationship between Users, Households and Organizations.
-- This is the single most important table for RLS: every downstream table
-- (transactions, budgets, ...) checks membership through here.

create table public.members (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.users (id),
  household_id uuid references public.households (id),
  organization_id uuid references public.organizations (id),
  role_id uuid not null references public.roles (id),

  invitation_email varchar(255),
  invitation_token text,
  invited_by uuid references public.users (id),
  invited_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  left_at timestamptz,

  status varchar(20) not null default 'pending',
  is_owner boolean not null default false,
  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  -- A member belongs to exactly one household OR one organization, never both/neither.
  constraint members_single_target_check check (
    (household_id is not null and organization_id is null)
    or (household_id is null and organization_id is not null)
  ),
  -- Cannot be added to the same household/organization more than once.
  constraint members_user_household_key unique (user_id, household_id),
  constraint members_user_organization_key unique (user_id, organization_id),
  constraint members_status_check
    check (status in ('pending', 'active', 'rejected', 'left', 'suspended'))
);

create index idx_members_user on public.members (user_id);
create index idx_members_household on public.members (household_id);
create index idx_members_organization on public.members (organization_id);
create index idx_members_role on public.members (role_id);
create index idx_members_status on public.members (status);

create trigger trg_members_audit
  before update on public.members
  for each row execute function public.tg_set_audit_on_update();

comment on table public.members is
  'Do not duplicate email/display_name/avatar/phone here — always join users (3NF).';

alter table public.members enable row level security;
