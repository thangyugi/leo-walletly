-- Migration: Settings Extensions
-- Description: Adds enterprise-grade profile fields and user preferences table.

-- 1. Extend profiles table
alter table public.profiles 
    add column if not exists legal_name text,
    add column if not exists phone_number text,
    add column if not exists job_title text;

-- 2. Create user_preferences table
create table if not exists public.user_preferences (
    user_id uuid references public.profiles(id) on delete cascade primary key,
    dashboard_density text default 'comfortable' check (dashboard_density in ('compact', 'comfortable')),
    hidden_balances boolean default false,
    start_page text default '/',
    currency text default 'USD',
    timezone text default 'UTC',
    locale text default 'en-US',
    lang text default 'en',
    fiscal_year_start text,
    number_formatting text default 'standard',
    date_formatting text default 'yyyy-MM-dd',
    notification_settings jsonb default '[
        {"category": "security", "email": true, "push": true, "sms": true, "inApp": true},
        {"category": "billing", "email": true, "push": false, "sms": false, "inApp": true},
        {"category": "transactions", "email": false, "push": true, "sms": false, "inApp": true},
        {"category": "product_updates", "email": true, "push": false, "sms": false, "inApp": false}
    ]'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS on user_preferences
alter table public.user_preferences enable row level security;

create policy "Users can view own preferences." on public.user_preferences
    for select using (auth.uid() = user_id);

create policy "Users can update own preferences." on public.user_preferences
    for update using (auth.uid() = user_id);

create policy "Users can insert own preferences." on public.user_preferences
    for insert with check (auth.uid() = user_id);

-- 4. Trigger for automatic preference creation
create or replace function public.initialize_user_preferences()
returns trigger as $$
begin
    insert into public.user_preferences (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_init_prefs
    after insert on public.profiles
    for each row execute procedure public.initialize_user_preferences();

-- 5. Helper function for audit trails (to include more metadata)
alter table public.audit_trails 
    add column if not exists risk_level text default 'low';

-- 6. Indices for performance
create index if not exists idx_audit_trails_user_id_created_at on public.audit_trails(user_id, created_at desc);
create index if not exists idx_audit_trails_action on public.audit_trails(action);
