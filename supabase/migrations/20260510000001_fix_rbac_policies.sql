-- Migration: Fix RBAC Policies
-- Description: Adds missing INSERT and DELETE policies for ledgers and members to allow frontend management.

-- 1. Ledgers: Allow Owners/Admins to create and delete ledgers
create policy "Owners/Admins can create ledgers." on public.ledgers
    for insert with check (
        exists (
            select 1 from public.ledger_members lm
            join public.ledgers l on l.id = lm.ledger_id
            where l.workspace_id = public.ledgers.workspace_id 
            and lm.user_id = auth.uid() 
            and lm.role in ('owner', 'admin')
        )
    );

create policy "Owners can delete ledgers." on public.ledgers
    for delete using (
        exists (
            select 1 from public.ledger_members
            where ledger_id = id and user_id = auth.uid() and role = 'owner'
        )
    );

-- 2. Ledger Members: Allow Owners/Admins to manage members
create policy "Owners/Admins can add members." on public.ledger_members
    for insert with check (
        exists (
            select 1 from public.ledger_members as m
            where m.ledger_id = public.ledger_members.ledger_id 
            and m.user_id = auth.uid() 
            and m.role in ('owner', 'admin')
        )
        -- Also allow a user to add themselves if they just created the ledger (handled by the system usually)
        -- But for direct frontend insert of the first member:
        or (user_id = auth.uid() and role = 'owner')
    );

create policy "Owners/Admins can delete members." on public.ledger_members
    for delete using (
        exists (
            select 1 from public.ledger_members as m
            where m.ledger_id = public.ledger_members.ledger_id 
            and m.user_id = auth.uid() 
            and m.role in ('owner', 'admin')
        )
    );

-- 3. Audit Trails: Allow authenticated users to log actions
create policy "Users can insert own audit logs." on public.audit_trails
    for insert with check (auth.uid() = user_id);

-- 4. Workspaces: Allow view if owner/admin of any ledger in it
-- (Already exists but let's ensure it's robust)
drop policy if exists "Members can view their workspaces." on public.workspaces;
create policy "Members can view their workspaces." on public.workspaces
    for select using (
        exists (
            select 1 from public.ledgers l
            join public.ledger_members lm on lm.ledger_id = l.id
            where l.workspace_id = public.workspaces.id and lm.user_id = auth.uid()
        )
    );
