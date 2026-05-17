-- Data Migration: Legacy transactions -> TransactionV3
-- This script moves historical data while preserving tenant context.

do $$
declare
    r record;
    v_org_id uuid;
    v_ws_id uuid;
    v_ledger_id uuid;
begin
    -- For each user who has transactions, find their default ledger context
    for r in (select distinct user_id from public.transactions) loop
        -- Find or create organization for this user if they don't have one
        -- (Assuming users already have an organization from the RBAC migration)
        select organization_id into v_org_id 
        from organization_members 
        where user_id = r.user_id 
        limit 1;
        
        if v_org_id is null then
            -- Create fallback org if missing (should not happen with enterprise RBAC)
            insert into organizations (name, type) values ('Individual Org', 'personal') returning id into v_org_id;
            insert into organization_members (organization_id, user_id, role) values (v_org_id, r.user_id, 'owner');
        end if;

        -- Find workspace
        select id into v_ws_id from workspaces where organization_id = v_org_id limit 1;
        if v_ws_id is null then
            insert into workspaces (organization_id, name, type) values (v_org_id, 'Default Workspace', 'personal') returning id into v_ws_id;
        end if;

        -- Find ledger
        select id into v_ledger_id from ledgers where workspace_id = v_ws_id limit 1;
        if v_ledger_id is null then
            insert into ledgers (workspace_id, name, type, currency) values (v_ws_id, 'Default Ledger', 'personal', 'JPY') returning id into v_ledger_id;
        end if;

        -- Migrate transactions for this user
        insert into public.transactions_v3 (
            id,
            organization_id,
            workspace_id,
            ledger_id,
            transaction_date,
            amount,
            description,
            category_id,
            transaction_type,
            status,
            currency_code,
            notes,
            metadata,
            created_at,
            updated_at
        )
        select 
            id,
            v_org_id,
            v_ws_id,
            v_ledger_id,
            date,
            abs(amount),
            description,
            null, -- category_id is UUID, cannot take legacy text category
            case 
                when amount >= 0 then 'income'
                else 'expense'
            end,
            'posted',
            'JPY',
            note,
            -- Store legacy category in metadata for reference
            coalesce(raw_data, '{}'::jsonb) || jsonb_build_object('legacy_category', category),
            created_at,
            updated_at
        from public.transactions
        where user_id = r.user_id
        on conflict (id) do nothing;
        
    end loop;
end $$;
