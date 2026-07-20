-- Foundation seed data: reference/master data + RBAC catalog.
-- Idempotent (safe to re-run) via ON CONFLICT DO NOTHING on each natural key.
--
-- Scope note: only reference tables and the global RBAC catalog are seeded here.
-- tenants/organizations/households/users/members are per-customer data and are
-- deliberately NOT seeded.

-- =========================================================================
-- currencies
-- =========================================================================
insert into public.currencies (code, numeric_code, name, symbol, decimal_places, rounding_mode) values
  ('USD', '840', 'US Dollar', '$', 2, 'HALF_UP'),
  ('EUR', '978', 'Euro', '€', 2, 'HALF_UP'),
  ('JPY', '392', 'Japanese Yen', '¥', 0, 'HALF_UP'),
  ('VND', '704', 'Vietnamese Dong', '₫', 0, 'HALF_UP'),
  ('GBP', '826', 'British Pound', '£', 2, 'HALF_UP'),
  ('SGD', '702', 'Singapore Dollar', 'S$', 2, 'HALF_UP'),
  ('AUD', '036', 'Australian Dollar', 'A$', 2, 'HALF_UP'),
  ('KWD', '414', 'Kuwaiti Dinar', 'د.ك', 3, 'HALF_UP')
on conflict (code) do nothing;

-- =========================================================================
-- languages
-- =========================================================================
insert into public.languages (code, locale, name, native_name, is_default) values
  ('en', 'en-US', 'English', 'English', true),
  ('ja', 'ja-JP', 'Japanese', '日本語', false),
  ('vi', 'vi-VN', 'Vietnamese', 'Tiếng Việt', false)
on conflict (code) do nothing;

-- =========================================================================
-- countries
-- =========================================================================
insert into public.countries (code, code3, numeric_code, name, native_name, phone_code, continent, currency_code, timezone_default, locale, flag_emoji) values
  ('US', 'USA', '840', 'United States', 'United States', '+1', 'North America', 'USD', 'America/New_York', 'en-US', '🇺🇸'),
  ('JP', 'JPN', '392', 'Japan', '日本', '+81', 'Asia', 'JPY', 'Asia/Tokyo', 'ja-JP', '🇯🇵'),
  ('VN', 'VNM', '704', 'Vietnam', 'Việt Nam', '+84', 'Asia', 'VND', 'Asia/Ho_Chi_Minh', 'vi-VN', '🇻🇳'),
  ('GB', 'GBR', '826', 'United Kingdom', 'United Kingdom', '+44', 'Europe', 'GBP', 'Europe/London', 'en-GB', '🇬🇧'),
  ('SG', 'SGP', '702', 'Singapore', 'Singapore', '+65', 'Asia', 'SGD', 'Asia/Singapore', 'en-SG', '🇸🇬'),
  ('AU', 'AUS', '036', 'Australia', 'Australia', '+61', 'Oceania', 'AUD', 'Australia/Sydney', 'en-AU', '🇦🇺')
on conflict (code) do nothing;

-- =========================================================================
-- time_zones
-- =========================================================================
insert into public.time_zones (code, name, utc_offset_minutes, supports_dst, country_code) values
  ('UTC', 'Coordinated Universal Time', 0, false, null),
  ('Asia/Tokyo', 'Japan Standard Time', 540, false, 'JP'),
  ('Asia/Ho_Chi_Minh', 'Indochina Time', 420, false, 'VN'),
  ('America/New_York', 'Eastern Time', -300, true, 'US'),
  ('Europe/London', 'Greenwich Mean Time', 0, true, 'GB'),
  ('Asia/Singapore', 'Singapore Time', 480, false, 'SG'),
  ('Australia/Sydney', 'Australian Eastern Time', 600, true, 'AU')
on conflict (code) do nothing;

-- =========================================================================
-- fiscal_calendars
-- =========================================================================
insert into public.fiscal_calendars (code, name, description, start_month, calendar_type, is_default) values
  ('CALENDAR_YEAR', 'Calendar Year (Jan-Dec)', 'Standard Jan-Dec fiscal year.', 1, 'monthly', true),
  ('JAPAN_FY', 'Japan Fiscal Year (Apr-Mar)', 'Standard Japanese corporate fiscal year.', 4, 'monthly', false)
on conflict (code) do nothing;

-- =========================================================================
-- roles (seed set from the design doc)
-- =========================================================================
insert into public.roles (code, name, description, scope, is_system, is_default, priority) values
  ('OWNER', 'Owner', 'Household owner. Full control.', 'household', true, false, 1000),
  ('ADMIN', 'Administrator', 'Household administrator.', 'household', true, false, 800),
  ('MEMBER', 'Member', 'Household member.', 'household', true, true, 500),
  ('VIEWER', 'Viewer', 'Read-only household access.', 'household', true, false, 100),
  ('ORG_OWNER', 'Organization Owner', 'Organization owner. Full control.', 'organization', true, false, 1000),
  ('ORG_ADMIN', 'Organization Admin', 'Organization administrator.', 'organization', true, false, 800),
  ('ORG_MEMBER', 'Organization Member', 'Organization member.', 'organization', true, true, 500),
  ('SYS_ADMIN', 'System Administrator', 'Platform-wide administrator.', 'system', true, false, 1000)
on conflict (code) do nothing;

-- =========================================================================
-- permissions (curated MVP catalog: resource:action:scope)
-- =========================================================================
insert into public.permissions (code, resource, action, scope, name, module) values
  -- household
  ('HOUSEHOLD_READ_HOUSEHOLD', 'household', 'read', 'household', 'View household', 'foundation'),
  ('HOUSEHOLD_UPDATE_HOUSEHOLD', 'household', 'update', 'household', 'Update household', 'foundation'),
  ('HOUSEHOLD_DELETE_HOUSEHOLD', 'household', 'delete', 'household', 'Delete household', 'foundation'),
  ('HOUSEHOLD_MANAGE_ALL', 'household', 'manage', 'all', 'Manage any household (system admin)', 'foundation'),
  -- organization
  ('ORGANIZATION_READ_ORGANIZATION', 'organization', 'read', 'organization', 'View organization', 'foundation'),
  ('ORGANIZATION_UPDATE_ORGANIZATION', 'organization', 'update', 'organization', 'Update organization', 'foundation'),
  ('ORGANIZATION_DELETE_ORGANIZATION', 'organization', 'delete', 'organization', 'Delete organization', 'foundation'),
  ('ORGANIZATION_MANAGE_ALL', 'organization', 'manage', 'all', 'Manage any organization (system admin)', 'foundation'),
  -- member
  ('MEMBER_READ_HOUSEHOLD', 'member', 'read', 'household', 'View household members', 'foundation'),
  ('MEMBER_INVITE_HOUSEHOLD', 'member', 'invite', 'household', 'Invite household members', 'foundation'),
  ('MEMBER_UPDATE_HOUSEHOLD', 'member', 'update', 'household', 'Change a household member''s role', 'foundation'),
  ('MEMBER_REMOVE_HOUSEHOLD', 'member', 'remove', 'household', 'Remove a household member', 'foundation'),
  ('MEMBER_READ_ORGANIZATION', 'member', 'read', 'organization', 'View organization members', 'foundation'),
  ('MEMBER_INVITE_ORGANIZATION', 'member', 'invite', 'organization', 'Invite organization members', 'foundation'),
  ('MEMBER_UPDATE_ORGANIZATION', 'member', 'update', 'organization', 'Change an organization member''s role', 'foundation'),
  ('MEMBER_REMOVE_ORGANIZATION', 'member', 'remove', 'organization', 'Remove an organization member', 'foundation'),
  ('MEMBER_MANAGE_ALL', 'member', 'manage', 'all', 'Manage any membership (system admin)', 'foundation'),
  -- user
  ('USER_READ_OWN', 'user', 'read', 'own', 'View own profile', 'foundation'),
  ('USER_UPDATE_OWN', 'user', 'update', 'own', 'Update own profile', 'foundation'),
  ('USER_MANAGE_ALL', 'user', 'manage', 'all', 'Manage any user (system admin)', 'foundation'),
  -- transaction (used by later schema parts, seeded here so household/org roles are usable immediately)
  ('TRANSACTION_CREATE_HOUSEHOLD', 'transaction', 'create', 'household', 'Create household transactions', 'transactions'),
  ('TRANSACTION_READ_HOUSEHOLD', 'transaction', 'read', 'household', 'View household transactions', 'transactions'),
  ('TRANSACTION_UPDATE_HOUSEHOLD', 'transaction', 'update', 'household', 'Edit household transactions', 'transactions'),
  ('TRANSACTION_DELETE_HOUSEHOLD', 'transaction', 'delete', 'household', 'Delete household transactions', 'transactions'),
  ('TRANSACTION_APPROVE_HOUSEHOLD', 'transaction', 'approve', 'household', 'Approve household transactions', 'transactions'),
  ('TRANSACTION_CREATE_ORGANIZATION', 'transaction', 'create', 'organization', 'Create organization transactions', 'transactions'),
  ('TRANSACTION_READ_ORGANIZATION', 'transaction', 'read', 'organization', 'View organization transactions', 'transactions'),
  ('TRANSACTION_UPDATE_ORGANIZATION', 'transaction', 'update', 'organization', 'Edit organization transactions', 'transactions'),
  ('TRANSACTION_DELETE_ORGANIZATION', 'transaction', 'delete', 'organization', 'Delete organization transactions', 'transactions'),
  ('TRANSACTION_APPROVE_ORGANIZATION', 'transaction', 'approve', 'organization', 'Approve organization transactions', 'transactions'),
  ('TRANSACTION_MANAGE_ALL', 'transaction', 'manage', 'all', 'Manage any transaction (system admin)', 'transactions'),
  -- report
  ('REPORT_READ_HOUSEHOLD', 'report', 'read', 'household', 'View household reports', 'reports'),
  ('REPORT_EXPORT_HOUSEHOLD', 'report', 'export', 'household', 'Export household reports', 'reports'),
  ('REPORT_READ_ORGANIZATION', 'report', 'read', 'organization', 'View organization reports', 'reports'),
  ('REPORT_EXPORT_ORGANIZATION', 'report', 'export', 'organization', 'Export organization reports', 'reports'),
  ('REPORT_MANAGE_ALL', 'report', 'manage', 'all', 'Manage any report (system admin)', 'reports'),
  -- system
  ('SYSTEM_MANAGE_ALL', 'system', 'manage', 'all', 'Manage system-wide settings (system admin)', 'foundation')
on conflict (code) do nothing;

-- =========================================================================
-- role_permissions mapping
-- =========================================================================
with rp (role_code, permission_code) as (
  values
    -- OWNER (household)
    ('OWNER', 'HOUSEHOLD_READ_HOUSEHOLD'), ('OWNER', 'HOUSEHOLD_UPDATE_HOUSEHOLD'), ('OWNER', 'HOUSEHOLD_DELETE_HOUSEHOLD'),
    ('OWNER', 'MEMBER_READ_HOUSEHOLD'), ('OWNER', 'MEMBER_INVITE_HOUSEHOLD'), ('OWNER', 'MEMBER_UPDATE_HOUSEHOLD'), ('OWNER', 'MEMBER_REMOVE_HOUSEHOLD'),
    ('OWNER', 'TRANSACTION_CREATE_HOUSEHOLD'), ('OWNER', 'TRANSACTION_READ_HOUSEHOLD'), ('OWNER', 'TRANSACTION_UPDATE_HOUSEHOLD'),
    ('OWNER', 'TRANSACTION_DELETE_HOUSEHOLD'), ('OWNER', 'TRANSACTION_APPROVE_HOUSEHOLD'),
    ('OWNER', 'REPORT_READ_HOUSEHOLD'), ('OWNER', 'REPORT_EXPORT_HOUSEHOLD'),
    ('OWNER', 'USER_READ_OWN'), ('OWNER', 'USER_UPDATE_OWN'),

    -- ADMIN (household) = OWNER minus delete household
    ('ADMIN', 'HOUSEHOLD_READ_HOUSEHOLD'), ('ADMIN', 'HOUSEHOLD_UPDATE_HOUSEHOLD'),
    ('ADMIN', 'MEMBER_READ_HOUSEHOLD'), ('ADMIN', 'MEMBER_INVITE_HOUSEHOLD'), ('ADMIN', 'MEMBER_UPDATE_HOUSEHOLD'), ('ADMIN', 'MEMBER_REMOVE_HOUSEHOLD'),
    ('ADMIN', 'TRANSACTION_CREATE_HOUSEHOLD'), ('ADMIN', 'TRANSACTION_READ_HOUSEHOLD'), ('ADMIN', 'TRANSACTION_UPDATE_HOUSEHOLD'),
    ('ADMIN', 'TRANSACTION_DELETE_HOUSEHOLD'), ('ADMIN', 'TRANSACTION_APPROVE_HOUSEHOLD'),
    ('ADMIN', 'REPORT_READ_HOUSEHOLD'), ('ADMIN', 'REPORT_EXPORT_HOUSEHOLD'),
    ('ADMIN', 'USER_READ_OWN'), ('ADMIN', 'USER_UPDATE_OWN'),

    -- MEMBER (household)
    ('MEMBER', 'HOUSEHOLD_READ_HOUSEHOLD'), ('MEMBER', 'MEMBER_READ_HOUSEHOLD'),
    ('MEMBER', 'TRANSACTION_CREATE_HOUSEHOLD'), ('MEMBER', 'TRANSACTION_READ_HOUSEHOLD'), ('MEMBER', 'TRANSACTION_UPDATE_HOUSEHOLD'),
    ('MEMBER', 'REPORT_READ_HOUSEHOLD'),
    ('MEMBER', 'USER_READ_OWN'), ('MEMBER', 'USER_UPDATE_OWN'),

    -- VIEWER (household)
    ('VIEWER', 'HOUSEHOLD_READ_HOUSEHOLD'), ('VIEWER', 'MEMBER_READ_HOUSEHOLD'),
    ('VIEWER', 'TRANSACTION_READ_HOUSEHOLD'), ('VIEWER', 'REPORT_READ_HOUSEHOLD'),
    ('VIEWER', 'USER_READ_OWN'),

    -- ORG_OWNER
    ('ORG_OWNER', 'ORGANIZATION_READ_ORGANIZATION'), ('ORG_OWNER', 'ORGANIZATION_UPDATE_ORGANIZATION'), ('ORG_OWNER', 'ORGANIZATION_DELETE_ORGANIZATION'),
    ('ORG_OWNER', 'MEMBER_READ_ORGANIZATION'), ('ORG_OWNER', 'MEMBER_INVITE_ORGANIZATION'), ('ORG_OWNER', 'MEMBER_UPDATE_ORGANIZATION'), ('ORG_OWNER', 'MEMBER_REMOVE_ORGANIZATION'),
    ('ORG_OWNER', 'TRANSACTION_CREATE_ORGANIZATION'), ('ORG_OWNER', 'TRANSACTION_READ_ORGANIZATION'), ('ORG_OWNER', 'TRANSACTION_UPDATE_ORGANIZATION'),
    ('ORG_OWNER', 'TRANSACTION_DELETE_ORGANIZATION'), ('ORG_OWNER', 'TRANSACTION_APPROVE_ORGANIZATION'),
    ('ORG_OWNER', 'REPORT_READ_ORGANIZATION'), ('ORG_OWNER', 'REPORT_EXPORT_ORGANIZATION'),
    ('ORG_OWNER', 'USER_READ_OWN'), ('ORG_OWNER', 'USER_UPDATE_OWN'),

    -- ORG_ADMIN = ORG_OWNER minus delete organization
    ('ORG_ADMIN', 'ORGANIZATION_READ_ORGANIZATION'), ('ORG_ADMIN', 'ORGANIZATION_UPDATE_ORGANIZATION'),
    ('ORG_ADMIN', 'MEMBER_READ_ORGANIZATION'), ('ORG_ADMIN', 'MEMBER_INVITE_ORGANIZATION'), ('ORG_ADMIN', 'MEMBER_UPDATE_ORGANIZATION'), ('ORG_ADMIN', 'MEMBER_REMOVE_ORGANIZATION'),
    ('ORG_ADMIN', 'TRANSACTION_CREATE_ORGANIZATION'), ('ORG_ADMIN', 'TRANSACTION_READ_ORGANIZATION'), ('ORG_ADMIN', 'TRANSACTION_UPDATE_ORGANIZATION'),
    ('ORG_ADMIN', 'TRANSACTION_DELETE_ORGANIZATION'), ('ORG_ADMIN', 'TRANSACTION_APPROVE_ORGANIZATION'),
    ('ORG_ADMIN', 'REPORT_READ_ORGANIZATION'), ('ORG_ADMIN', 'REPORT_EXPORT_ORGANIZATION'),
    ('ORG_ADMIN', 'USER_READ_OWN'), ('ORG_ADMIN', 'USER_UPDATE_OWN'),

    -- ORG_MEMBER
    ('ORG_MEMBER', 'ORGANIZATION_READ_ORGANIZATION'), ('ORG_MEMBER', 'MEMBER_READ_ORGANIZATION'),
    ('ORG_MEMBER', 'TRANSACTION_CREATE_ORGANIZATION'), ('ORG_MEMBER', 'TRANSACTION_READ_ORGANIZATION'), ('ORG_MEMBER', 'TRANSACTION_UPDATE_ORGANIZATION'),
    ('ORG_MEMBER', 'REPORT_READ_ORGANIZATION'),
    ('ORG_MEMBER', 'USER_READ_OWN'), ('ORG_MEMBER', 'USER_UPDATE_OWN'),

    -- SYS_ADMIN
    ('SYS_ADMIN', 'HOUSEHOLD_MANAGE_ALL'), ('SYS_ADMIN', 'ORGANIZATION_MANAGE_ALL'), ('SYS_ADMIN', 'MEMBER_MANAGE_ALL'),
    ('SYS_ADMIN', 'USER_MANAGE_ALL'), ('SYS_ADMIN', 'TRANSACTION_MANAGE_ALL'), ('SYS_ADMIN', 'REPORT_MANAGE_ALL'), ('SYS_ADMIN', 'SYSTEM_MANAGE_ALL')
)
insert into public.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'allow'
from rp
join public.roles r on r.code = rp.role_code
join public.permissions p on p.code = rp.permission_code
on conflict (role_id, permission_id) do nothing;
