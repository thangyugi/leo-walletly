-- Migration: Update onboarding RPC for V3
-- Includes organization_members insertion for consistent RBAC.

create or replace function public.create_new_ledger_system(
    org_name text,
    ledger_name text,
    base_currency text,
    timezone text,
    locale text,
    fiscal_year_start text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    new_org_id uuid;
    new_workspace_id uuid;
    new_ledger_id uuid;
    v_user_id uuid;
    v_slug text;
    v_fiscal_date date;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Not authorized';
    end if;

    -- Robust date casting
    begin
        v_fiscal_date := (extract(year from now()) || '-' || coalesce(fiscal_year_start, '01-01'))::date;
    exception when others then
        v_fiscal_date := (extract(year from now()) || '-01-01')::date;
    end;

    -- Generate slug
    v_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- 1. Create Organization
    insert into public.organizations (name, slug)
    values (org_name, v_slug || '-' || substr(gen_random_uuid()::text, 1, 8))
    returning id into new_org_id;

    -- 2. Create Organization Membership (Owner)
    insert into public.organization_members (organization_id, user_id, role)
    values (new_org_id, v_user_id, 'owner');

    -- 3. Create Default Workspace
    insert into public.workspaces (organization_id, name, slug)
    values (new_org_id, 'General Workspace', 'general')
    returning id into new_workspace_id;

    -- 4. Create Ledger
    insert into public.ledgers (workspace_id, name, code, base_currency, timezone, locale, fiscal_year_start)
    values (new_workspace_id, ledger_name, 'MAIN', base_currency, timezone, locale, v_fiscal_date)
    returning id into new_ledger_id;

    -- 5. Assign Ledger Owner
    insert into public.ledger_members (ledger_id, user_id, role, status)
    values (new_ledger_id, v_user_id, 'owner', 'active');

    return jsonb_build_object('success', true, 'ledger_id', new_ledger_id);
end;
$$;
