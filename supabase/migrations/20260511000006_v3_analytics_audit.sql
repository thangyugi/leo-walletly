/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 07
   Analytics, Taxonomy & Audit:
     category_rules          (auto-classification rules)
     category_templates      (preset category bundles)
     audit_logs              (immutable compliance trail)
     activity_logs           (user activity stream)
     analytics_snapshots     (pre-computed rollups)
   ============================================================
   Principle:
     Analytics ≠ Accounting
     Snapshots are derived data — source of truth is always
     transactions_v3 + journal_entries
   ============================================================ */

-- ─────────────────────────────────────────────
-- CATEGORY RULES
-- Auto-classification rules for transactions
-- e.g. merchant_normalized contains "スタバ" → Coffee category
-- ─────────────────────────────────────────────
create table if not exists category_rules (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,
  category_id       uuid        not null references categories(id) on delete cascade,

  -- Rule matching
  rule_name         text        not null,
  rule_name_ja      text,
  rule_name_vi      text,
  rule_name_en      text,

  rule_type         text        not null,
  -- keyword_match  : description/merchant contains keyword
  -- regex_match    : description matches regex
  -- amount_range   : amount between min and max
  -- merchant_code  : merchant MCC code match
  -- provider_match : specific payment provider
  -- compound       : multiple conditions (AND/OR)

  -- Conditions
  match_field       text,
  -- merchant_normalized | description | provider | merchant_category_code | amount

  match_operator    text,
  -- contains | starts_with | ends_with | equals | regex | between | in

  match_value       text,
  match_value_secondary text,   -- for 'between' operator
  match_values      jsonb,      -- for 'in' operator (array of strings)

  -- Compound rule expression (JSON DSL)
  condition_tree    jsonb,

  -- Suggestions when rule fires
  suggested_expense_scope text,
  -- personal | shared_household | childcare | business | reimbursable

  suggested_payment_instrument_type text,

  -- Rule metadata
  priority          integer     not null default 100,  -- lower = higher priority
  is_active         boolean     not null default true,
  is_system         boolean     not null default false, -- pre-seeded rules
  match_count       bigint      not null default 0,     -- times this rule fired
  last_matched_at   timestamptz,

  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_category_rules_workspace
  on category_rules(workspace_id, priority);
create index if not exists idx_category_rules_category
  on category_rules(category_id);
create index if not exists idx_category_rules_active
  on category_rules(workspace_id, is_active) where is_active;

comment on table category_rules is
  'Auto-classification rules for transactions.
   rule_type: keyword_match|regex_match|amount_range|merchant_code|provider_match|compound.
   System rules pre-seeded for Japanese merchants: スタバ→Coffee, イオン→Groceries, etc.
   priority: lower number = higher priority.';

-- ─────────────────────────────────────────────
-- CATEGORY TEMPLATES
-- Preset category bundles for quick workspace setup
-- e.g. "Japanese Family Budget", "Freelancer Japan", "Vietnam Household"
-- ─────────────────────────────────────────────
create table if not exists category_templates (
  id              uuid        primary key default gen_random_uuid(),
  template_name   text        not null,
  template_name_ja text       not null,
  template_name_vi text       not null,
  template_name_en text       not null,
  description_ja  text,
  description_vi  text,
  description_en  text,
  region          text,       -- jp | vn | global | en
  use_case        text,       -- personal | household | freelancer | business
  categories      jsonb       not null default '[]'::jsonb,
  -- Array of category definitions (name_ja, name_vi, name_en, emoji, color, type)
  rules           jsonb       not null default '[]'::jsonb,
  -- Array of category_rules definitions
  is_active       boolean     not null default true,
  is_system       boolean     not null default true,
  usage_count     bigint      not null default 0,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_category_templates_region
  on category_templates(region, use_case) where is_active;

comment on table category_templates is
  'Preset category bundles for workspace setup.
   Templates: Japanese Family Budget (ja), Vietnamese Household (vi), Freelancer Japan (ja/en).
   categories + rules are JSON definitions applied on workspace creation.';

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- Immutable compliance trail (append-only)
-- ─────────────────────────────────────────────
create table if not exists audit_logs_v3 (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id),
  workspace_id    uuid        references workspaces(id),
  ledger_id       uuid        references ledgers(id),

  -- Who & when
  actor_id        uuid,       -- auth.uid() — nullable for system events
  actor_email     text,
  actor_role      text,
  actor_ip        inet,
  actor_user_agent text,
  session_id      text,

  -- What
  event_type      text        not null,
  -- transaction.created | transaction.updated | transaction.deleted
  -- journal.posted | journal.reversed
  -- import.committed | import.rolled_back
  -- reconciliation.completed
  -- settings.changed | member.invited | member.removed
  -- category.created | rule.modified

  entity_type     text        not null,   -- transaction | journal_entry | import_job | etc.
  entity_id       uuid,
  entity_ref      text,                   -- human-readable reference

  -- Change details
  action          text        not null,   -- create | update | delete | post | reverse | approve
  old_values      jsonb,                  -- previous state (masked sensitive fields)
  new_values      jsonb,                  -- new state
  diff            jsonb,                  -- computed diff

  -- Context
  description     text,
  description_ja  text,
  description_vi  text,
  description_en  text,

  -- Severity
  severity        text        not null default 'info',
  -- debug | info | notice | warning | critical

  is_sensitive    boolean     not null default false,

  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
  -- NO updated_at — audit logs are immutable
);

create index if not exists idx_audit_logs_v3_org
  on audit_logs_v3(organization_id, created_at desc);
create index if not exists idx_audit_logs_v3_ledger
  on audit_logs_v3(ledger_id, created_at desc) where ledger_id is not null;
create index if not exists idx_audit_logs_v3_actor
  on audit_logs_v3(actor_id, created_at desc) where actor_id is not null;
create index if not exists idx_audit_logs_v3_entity
  on audit_logs_v3(entity_type, entity_id) where entity_id is not null;
create index if not exists idx_audit_logs_v3_event
  on audit_logs_v3(event_type, created_at desc);

comment on table audit_logs_v3 is
  'Immutable compliance audit trail. Append-only — no UPDATE or DELETE allowed.
   event_type: transaction.created|journal.posted|import.committed|reconciliation.completed|settings.changed.
   severity: debug|info|notice|warning|critical.
   old_values/new_values masked for sensitive financial data per compliance requirements.';

-- Prevent modification of audit logs
create or replace function prevent_audit_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit logs are immutable — modification not allowed'
    using errcode = 'P0003';
end;
$$;

create trigger audit_logs_v3_no_update
  before update on audit_logs_v3
  for each row execute function prevent_audit_log_mutation();

create trigger audit_logs_v3_no_delete
  before delete on audit_logs_v3
  for each row execute function prevent_audit_log_mutation();

-- ─────────────────────────────────────────────
-- ACTIVITY LOGS
-- User-facing activity feed (mutable, for UX)
-- Different from audit_logs — these can be marked read
-- ─────────────────────────────────────────────
create table if not exists activity_logs (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id),
  workspace_id    uuid        references workspaces(id),
  ledger_id       uuid        references ledgers(id),
  actor_id        uuid,

  activity_type   text        not null,
  -- transaction.added | receipt.scanned | import.completed | budget.exceeded
  -- member.joined | reconciliation.opened | report.generated

  entity_type     text,
  entity_id       uuid,

  -- i18n activity description
  title_ja        text,
  title_vi        text,
  title_en        text,
  body_ja         text,
  body_vi         text,
  body_en         text,

  -- Amount context (for financial activities)
  amount          numeric(20,6),
  currency_code   char(3),

  -- Notification
  is_read         boolean     not null default false,
  read_at         timestamptz,

  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_activity_logs_workspace
  on activity_logs(workspace_id, created_at desc) where workspace_id is not null;
create index if not exists idx_activity_logs_unread
  on activity_logs(organization_id, is_read) where not is_read;

comment on table activity_logs is
  'User-facing activity feed (mutable). title/body in ja/vi/en for i18n display.
   activity_type: transaction.added|receipt.scanned|import.completed|budget.exceeded|member.joined.
   is_read: marks user has seen this activity.';

-- ─────────────────────────────────────────────
-- ANALYTICS SNAPSHOTS
-- Pre-computed rollups — NOT accounting source of truth
-- ─────────────────────────────────────────────
create table if not exists analytics_snapshots (
  id                uuid        primary key default gen_random_uuid(),
  ledger_id         uuid        not null references ledgers(id) on delete cascade,
  workspace_id      uuid        not null references workspaces(id) on delete cascade,

  -- Snapshot granularity
  snapshot_type     text        not null,
  -- daily | weekly | monthly | quarterly | annual

  -- Period covered
  period_start      date        not null,
  period_end        date        not null,
  period_label      text        not null,  -- "2026-04", "2026-Q2", "FY2026"

  -- Household dimension (null = whole ledger aggregate)
  household_member_id uuid      references household_members(id) on delete set null,
  expense_scope     text,
  -- personal | shared_household | childcare | business | null (=all)

  -- Core metrics
  total_income      numeric(20,6) not null default 0,
  total_expense     numeric(20,6) not null default 0,
  net_balance       numeric(20,6) generated always as
    (total_income - total_expense) stored,
  transaction_count integer     not null default 0,
  avg_daily_expense numeric(20,6),

  -- Category breakdown (JSON for flexibility)
  by_category       jsonb       not null default '{}'::jsonb,
  -- { "category_id": { "amount": 12000, "count": 5, "name_ja": "食費" } }

  by_payment_instrument jsonb   not null default '{}'::jsonb,
  -- { "instrument_id": { "amount": 45000, "name": "Rakuten Pay" } }

  by_funding_source  jsonb      not null default '{}'::jsonb,
  -- { "source_id": { "amount": 45000, "name": "Rakuten Credit Card" } }

  by_household_member jsonb     not null default '{}'::jsonb,
  -- Household dashboard data:
  -- { "member_id": { "name": "夫", "personal": 62000, "shared": 110000 } }

  -- Top merchants
  top_merchants     jsonb       not null default '[]'::jsonb,
  -- [{ "name": "スターバックス", "amount": 4200, "count": 7 }]

  -- Budget tracking
  budget_utilization jsonb      not null default '{}'::jsonb,
  -- { "category_id": { "budget": 50000, "spent": 38000, "pct": 76 } }

  currency_code     char(3)     not null,

  -- Computation metadata
  computed_at       timestamptz not null default now(),
  is_final          boolean     not null default false,
  -- true = period is closed, no more transactions expected

  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists idx_analytics_snapshots_unique
  on analytics_snapshots(ledger_id, snapshot_type, period_start, period_end,
    coalesce(household_member_id::text, ''), coalesce(expense_scope, ''));
create index if not exists idx_analytics_snapshots_ledger
  on analytics_snapshots(ledger_id, period_start desc);
create index if not exists idx_analytics_snapshots_member
  on analytics_snapshots(household_member_id) where household_member_id is not null;

comment on table analytics_snapshots is
  'Pre-computed analytics rollups. Analytics ≠ Accounting — this is DERIVED data.
   Source of truth is always transactions_v3 + journal_entries.
   by_household_member enables: Husband ¥110,000 / Wife ¥70,000 / Shared ¥180,000 dashboard.
   snapshot_type: daily|weekly|monthly|quarterly|annual.
   expense_scope filter: personal|shared_household|childcare|business|null(=all).';

-- ─────────────────────────────────────────────
-- SEED: Default category templates (Japanese, Vietnamese, English)
-- ─────────────────────────────────────────────
insert into category_templates (
  template_name, template_name_ja, template_name_vi, template_name_en,
  description_ja, description_vi, description_en,
  region, use_case, categories, rules
) values
(
  'Japanese Family Budget',
  '日本家計簿テンプレート',
  'Ngân sách gia đình Nhật Bản',
  'Japanese Family Budget',
  '日本の一般家庭向けカテゴリーとルール（コンビニ、スーパー、交通費等）',
  'Danh mục và quy tắc cho gia đình Nhật Bản (convenience store, siêu thị, giao thông)',
  'Categories and rules for Japanese households (convenience stores, supermarkets, transit)',
  'jp', 'household',
  '[
    {"name_ja":"食費","name_vi":"Ăn uống","name_en":"Food & Dining","emoji":"🍜","color":"#f97316","type":"expense"},
    {"name_ja":"交通費","name_vi":"Đi lại","name_en":"Transportation","emoji":"🚃","color":"#3b82f6","type":"expense"},
    {"name_ja":"買い物","name_vi":"Mua sắm","name_en":"Shopping","emoji":"🛍️","color":"#a855f7","type":"expense"},
    {"name_ja":"娯楽","name_vi":"Giải trí","name_en":"Entertainment","emoji":"🎮","color":"#ec4899","type":"expense"},
    {"name_ja":"医療・健康","name_vi":"Y tế & Sức khỏe","name_en":"Health & Medical","emoji":"💊","color":"#14b8a6","type":"expense"},
    {"name_ja":"光熱費・通信","name_vi":"Tiện ích & Viễn thông","name_en":"Utilities & Telecom","emoji":"💡","color":"#eab308","type":"expense"},
    {"name_ja":"住居費","name_vi":"Nhà ở","name_en":"Housing","emoji":"🏠","color":"#6366f1","type":"expense"},
    {"name_ja":"教育・子育て","name_vi":"Giáo dục & Trẻ em","name_en":"Education & Childcare","emoji":"📚","color":"#0ea5e9","type":"expense"},
    {"name_ja":"保険・税金","name_vi":"Bảo hiểm & Thuế","name_en":"Insurance & Tax","emoji":"🛡️","color":"#94a3b8","type":"expense"},
    {"name_ja":"収入","name_vi":"Thu nhập","name_en":"Income","emoji":"💰","color":"#22c55e","type":"income"},
    {"name_ja":"その他","name_vi":"Khác","name_en":"Other","emoji":"📦","color":"#64748b","type":"expense"}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'Vietnamese Household',
  'ベトナム家庭テンプレート',
  'Ngân sách hộ gia đình Việt Nam',
  'Vietnamese Household Budget',
  'ベトナムの一般家庭向けカテゴリー（VND対応）',
  'Danh mục cho hộ gia đình Việt Nam (hỗ trợ VND)',
  'Categories for Vietnamese households (VND support)',
  'vn', 'household',
  '[
    {"name_ja":"食費","name_vi":"Ăn uống","name_en":"Food & Dining","emoji":"🍜","color":"#f97316","type":"expense"},
    {"name_ja":"交通費","name_vi":"Đi lại","name_en":"Transportation","emoji":"🛵","color":"#3b82f6","type":"expense"},
    {"name_ja":"買い物","name_vi":"Mua sắm","name_en":"Shopping","emoji":"🛍️","color":"#a855f7","type":"expense"},
    {"name_ja":"医療・健康","name_vi":"Y tế & Sức khỏe","name_en":"Health","emoji":"💊","color":"#14b8a6","type":"expense"},
    {"name_ja":"光熱費","name_vi":"Điện nước & Viễn thông","name_en":"Utilities","emoji":"💡","color":"#eab308","type":"expense"},
    {"name_ja":"教育","name_vi":"Học phí & Giáo dục","name_en":"Education","emoji":"📚","color":"#0ea5e9","type":"expense"},
    {"name_ja":"収入","name_vi":"Thu nhập","name_en":"Income","emoji":"💰","color":"#22c55e","type":"income"},
    {"name_ja":"その他","name_vi":"Khác","name_en":"Other","emoji":"📦","color":"#64748b","type":"expense"}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'Freelancer Japan',
  'フリーランサー（日本）テンプレート',
  'Freelancer tại Nhật Bản',
  'Freelancer Japan',
  'フリーランサー向け：事業経費・個人費・確定申告対応カテゴリー',
  'Dành cho freelancer ở Nhật: chi phí kinh doanh, cá nhân, khai thuế',
  'For Japan-based freelancers: business expenses, personal, tax filing ready',
  'jp', 'freelancer',
  '[
    {"name_ja":"事業経費","name_vi":"Chi phí kinh doanh","name_en":"Business Expenses","emoji":"💼","color":"#6366f1","type":"expense"},
    {"name_ja":"交通費（事業）","name_vi":"Đi lại (KD)","name_en":"Business Transport","emoji":"🚃","color":"#3b82f6","type":"expense"},
    {"name_ja":"通信費（事業）","name_vi":"Viễn thông (KD)","name_en":"Business Telecom","emoji":"📱","color":"#0ea5e9","type":"expense"},
    {"name_ja":"食費（事業）","name_vi":"Ăn uống (KD)","name_en":"Business Dining","emoji":"🍱","color":"#f97316","type":"expense"},
    {"name_ja":"書籍・研修","name_vi":"Sách & Đào tạo","name_en":"Books & Training","emoji":"📚","color":"#8b5cf6","type":"expense"},
    {"name_ja":"ソフトウェア","name_vi":"Phần mềm","name_en":"Software & Tools","emoji":"💻","color":"#ec4899","type":"expense"},
    {"name_ja":"食費（個人）","name_vi":"Ăn uống (cá nhân)","name_en":"Personal Food","emoji":"🍜","color":"#f97316","type":"expense"},
    {"name_ja":"売上","name_vi":"Doanh thu","name_en":"Revenue","emoji":"💰","color":"#22c55e","type":"income"},
    {"name_ja":"その他","name_vi":"Khác","name_en":"Other","emoji":"📦","color":"#64748b","type":"expense"}
  ]'::jsonb,
  '[]'::jsonb
)
on conflict do nothing;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table category_rules       enable row level security;
alter table category_templates   enable row level security;
alter table audit_logs_v3        enable row level security;
alter table activity_logs        enable row level security;
alter table analytics_snapshots  enable row level security;

-- Category rules: workspace members
create policy "category_rules_workspace_select"
  on category_rules for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

create policy "category_rules_workspace_write"
  on category_rules for all
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin', 'accountant')
    )
  );

-- Category templates: public read
create policy "category_templates_public_read"
  on category_templates for select
  using (is_active = true);

-- Audit logs: org members (read-only, no write via RLS)
create policy "audit_logs_v3_org_select"
  on audit_logs_v3 for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'auditor')
    )
  );

-- System insert only (service role)
-- Users cannot insert audit logs directly — done via server-side triggers

-- Activity logs: personal + workspace
create policy "activity_logs_workspace_select"
  on activity_logs for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
    or actor_id = auth.uid()
  );

-- Analytics snapshots: ledger members
create policy "analytics_snapshots_ledger_select"
  on analytics_snapshots for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

-- Triggers
create trigger category_rules_updated_at
  before update on category_rules
  for each row execute function update_updated_at_column();

create trigger analytics_snapshots_updated_at
  before update on analytics_snapshots
  for each row execute function update_updated_at_column();
