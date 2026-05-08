-- Advanced Budgeting and Keyword Management Migration

-- 1. Table: group_keywords (Replacing text[] column for better management)
create table if not exists public.group_keywords (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    group_id uuid references public.custom_groups(id) on delete cascade not null,
    keyword text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, group_id, keyword)
);

-- 2. Table: group_budgets (Flexible periods)
create table if not exists public.group_budgets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    group_id uuid references public.custom_groups(id) on delete cascade not null,
    amount numeric not null,
    period_type text default 'monthly' not null, -- 'monthly', 'weekly', 'custom'
    start_day integer default 1, -- For monthly: day of month (1-31)
    start_date date, -- For custom periods
    end_date date,   -- For custom periods
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.group_keywords enable row level security;
alter table public.group_budgets enable row level security;

-- Policies
create policy "Users can manage own keywords." on public.group_keywords for all using (auth.uid() = user_id);
create policy "Users can manage own budgets." on public.group_budgets for all using (auth.uid() = user_id);

-- Triggers
create trigger handle_group_budgets_updated_at before update on public.group_budgets for each row execute procedure public.handle_updated_at();

-- Migrate existing keywords (Optional/Safety)
insert into public.group_keywords (user_id, group_id, keyword)
select user_id, id, unnest(keywords)
from public.custom_groups
where keywords is not null and array_length(keywords, 1) > 0
on conflict do nothing;
