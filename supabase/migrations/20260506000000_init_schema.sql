-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Table: profiles
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table: custom_groups
create table public.custom_groups (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    parent_id uuid references public.custom_groups(id) on delete cascade, -- Hierarchy: Root -> Child
    name text not null,
    color text not null,
    emoji text not null,
    is_default boolean default false not null,
    category_key text,
    budget_limit numeric,
    warning_threshold numeric default 80,
    keywords text[] default array[]::text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Table: transactions
create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    date date not null,
    amount numeric not null,
    description text not null,
    category text not null,
    provider text not null,
    type text not null, -- 'payment', 'income', 'transfer'
    note text,
    raw_data jsonb, -- Store items or extra data
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Table: group_assignments
create table public.group_assignments (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    description text not null,
    group_id uuid references public.custom_groups(id) on delete cascade not null,
    is_auto boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, description)
);

-- 5. Table: recurring_transactions
create table public.recurring_transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    description text not null,
    amount numeric not null,
    category text not null,
    provider text not null,
    day_of_month integer not null check (day_of_month >= 1 and day_of_month <= 31),
    group_id uuid references public.custom_groups(id) on delete set null,
    note text,
    is_active boolean default true not null,
    applied_months text[] default array[]::text[], -- Store "YYYY-MM" strings
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.custom_groups enable row level security;
alter table public.transactions enable row level security;
alter table public.group_assignments enable row level security;
alter table public.recurring_transactions enable row level security;

-- Profiles
create policy "Users can view own profile." on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Custom Groups
create policy "Users can manage own groups." on public.custom_groups 
    for all using (auth.uid() = user_id);

-- Transactions
create policy "Users can manage own transactions." on public.transactions 
    for all using (auth.uid() = user_id);

-- Group Assignments
create policy "Users can manage own assignments." on public.group_assignments 
    for all using (auth.uid() = user_id);

-- Recurring Transactions
create policy "Users can manage own recurring txns." on public.recurring_transactions 
    for all using (auth.uid() = user_id);

-- Updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger handle_groups_updated_at before update on public.custom_groups for each row execute procedure public.handle_updated_at();
create trigger handle_transactions_updated_at before update on public.transactions for each row execute procedure public.handle_updated_at();
create trigger handle_assignments_updated_at before update on public.group_assignments for each row execute procedure public.handle_updated_at();
create trigger handle_recurring_updated_at before update on public.recurring_transactions for each row execute procedure public.handle_updated_at();

-- Auth Hook for Profile Creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

