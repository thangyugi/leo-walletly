-- Foundation table 9/18: exchange_rates
-- docs/database/01_foundation_schema.html#exchange_rates
--
-- Immutable by design: once a rate has been used for accounting, it must never be
-- UPDATEd — insert a new row instead. Application layer must enforce this; the
-- RLS policy for this table blocks UPDATE entirely (insert-only from clients).

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),

  from_currency_code char(3) not null references public.currencies (code),
  to_currency_code char(3) not null references public.currencies (code),
  exchange_rate numeric(20, 10) not null,
  inverse_rate numeric(20, 10),
  rate_type varchar(20) not null default 'spot',
  provider varchar(50),
  effective_from timestamptz not null,
  effective_to timestamptz,
  fetched_at timestamptz,
  is_official boolean not null default true,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint exchange_rates_unique
    unique (from_currency_code, to_currency_code, rate_type, effective_from),
  constraint exchange_rates_different_currencies_check
    check (from_currency_code <> to_currency_code),
  constraint exchange_rates_positive_rate_check check (exchange_rate > 0),
  constraint exchange_rates_rate_type_check
    check (rate_type in ('spot', 'closing', 'average', 'manual'))
);

create index idx_exchange_from_currency on public.exchange_rates (from_currency_code);
create index idx_exchange_to_currency on public.exchange_rates (to_currency_code);
create index idx_exchange_effective_from on public.exchange_rates (effective_from);
create index idx_exchange_rate_type on public.exchange_rates (rate_type);
create index idx_exchange_active on public.exchange_rates (is_active);

create trigger trg_exchange_rates_audit
  before update on public.exchange_rates
  for each row execute function public.tg_set_audit_on_update();

alter table public.exchange_rates enable row level security;
