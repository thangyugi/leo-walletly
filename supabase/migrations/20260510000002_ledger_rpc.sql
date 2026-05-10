-- Migration: Ledger Management RPC (Full Localization Support)
-- Description: Adds a secure RPC to create a ledger with smart defaults for timezone, fiscal year, and locale.

create or replace function public.create_ledger_with_owner(
    p_workspace_id uuid,
    p_name text,
    p_currency text,
    p_timezone text,
    p_fiscal_year_start text,
    p_locale text,
    p_code text
)
returns uuid as $$
declare
    new_ledger_id uuid;
begin
    -- 1. Check if user is owner/admin of the workspace
    if not exists (
        select 1 from public.ledger_members lm
        join public.ledgers l on l.id = lm.ledger_id
        where l.workspace_id = p_workspace_id 
        and lm.user_id = auth.uid() 
        and lm.role in ('owner', 'admin')
    ) then
        raise exception 'Unauthorized: You do not have permission to create ledgers in this workspace.';
    end if;

    -- 2. Create the ledger with regional defaults
    insert into public.ledgers (
        workspace_id, 
        name, 
        base_currency, 
        timezone, 
        fiscal_year_start,
        locale,
        code
    )
    values (
        p_workspace_id, 
        p_name, 
        p_currency, 
        p_timezone, 
        (to_char(now(), 'YYYY') || '-' || p_fiscal_year_start)::date,
        p_locale,
        p_code
    )
    returning id into new_ledger_id;

    -- 3. Assign the creator as owner
    insert into public.ledger_members (ledger_id, user_id, role, status)
    values (new_ledger_id, auth.uid(), 'owner', 'active');

    return new_ledger_id;
end;
$$ language plpgsql security definer;
