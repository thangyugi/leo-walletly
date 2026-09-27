# Leo Walletly — Database Schema V2 (bản dựng lại sạch)

> Trạng thái: **ĐỀ XUẤT** — dùng làm đặc tả để viết lại toàn bộ `supabase/migrations/` trước khi xoá và tạo lại database trên Supabase.
> Thay thế: 23 migration Foundation hiện tại (`20260720000001` → `20260720000023`) và các bảng cũ mà code còn gọi (`ledgers`, `ledger_members`, `transactions`, `categories`, `category_budgets`, `category_balances`, `category_translations`, `recurring_transactions`, `audit_logs`, `device_verifications`, `ui_translations`).
> Nguồn: rút gọn từ `docs/database/01…13_*.html` (≈140 bảng) xuống **25 bảng** đủ cho mọi màn hình hiện có của app.

---

## 0. Các quyết định thiết kế (cần xác nhận trước khi viết migration)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Gộp `tenants` + `households` + `organizations` thành 1 bảng `ledgers`** (có `ledger_type`). Mọi bảng nghiệp vụ chỉ có `ledger_id`. | UI chỉ có khái niệm "元帳 / sổ". Bỏ được CHECK `household XOR organization` trên mọi bảng và một nửa độ phức tạp RLS. |
| D2 | **`users.id` = `auth.users.id`** (không có `auth_user_id` riêng). | Bỏ hàm `current_user_id()`, RLS chỉ cần `auth.uid()`. |
| D3 | **`amount` luôn dương**, chiều tiền do `transaction_type` quyết định. | Đúng tài liệu 04; tránh loạn dấu âm/dương. Parser import phải đổi sang `Math.abs`. |
| D4 | **`category_id` nằm trên `transactions`** (không dùng `transaction_items` ở MVP). | App không có chức năng chia 1 giao dịch nhiều danh mục. Chia tiền giữa **người** dùng `transaction_shares`. |
| D5 | **Tài khoản là bảng thật `financial_accounts`**, có `provider_code` để khớp bộ parser (`paypay`, `smbc`…). | Hiện tại `'paypay'` bị `isUuid()` biến thành `null` khi lưu → mất thông tin tài khoản. |
| D6 | **Loại danh mục = `expense / income / transfer`**. Bỏ `cost_center / department / project / team / subsidiary`. | App quản lý chi tiêu cá nhân/gia đình. |
| D7 | **Lời mời tách thành bảng `ledger_invitations`** (không nằm trong `ledger_members`). | Mời được email chưa đăng ký, mời lại người đã rời/từ chối, token có hạn và chỉ lưu hash. |
| D8 | Master data dùng **mã tự nhiên làm khoá chính** (`currencies.code`, `countries.code`, `languages.code`, `time_zones.code`). | FK đọc được, không cần tra uuid. |
| D9 | Chuỗi hiển thị cho 3 ngôn ngữ nằm trong `lib/i18n.ts`; dữ liệu người dùng đa ngôn ngữ dùng cột `jsonb` (`name_i18n`). Bỏ `ui_translations`, `category_translations`. | Ít bảng, không cần API dịch. |

## 1. Quy ước chung

**Kiểu dữ liệu**
- Tiền: `numeric(20,4)`; tỷ giá: `numeric(20,10)`.
- Ngày giao dịch: `date` (và `time` tuỳ chọn); mốc hệ thống: `timestamptz`.
- Email: `citext` (so sánh không phân biệt hoa/thường).
- Enum: `varchar` + `CHECK` (dễ thêm giá trị hơn Postgres enum).

**Khối cột AUDIT** — mọi bảng ghi *AUDIT* trong bảng cột dưới đây đều có đủ 7 cột này:

| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `created_at` | timestamptz | ❌ | `now()` | Thời điểm tạo |
| `updated_at` | timestamptz | ❌ | `now()` | Trigger `tg_touch` cập nhật |
| `deleted_at` | timestamptz | ✅ | | Xoá mềm. Mọi RLS/UNIQUE lọc `deleted_at is null` |
| `created_by` | uuid | ✅ | `auth.uid()` | FK → `users.id` `on delete set null` |
| `updated_by` | uuid | ✅ | | Trigger `tg_touch` gán `auth.uid()` |
| `version` | integer | ❌ | `1` | Khoá lạc quan, trigger tăng +1 |
| `metadata` | jsonb | ❌ | `'{}'` | Dữ liệu mở rộng |

**Trigger chung**
- `tg_touch` (BEFORE UPDATE): `updated_at = now()`, `updated_by = auth.uid()`, `version += 1`.
- `tg_audit` (AFTER INSERT/UPDATE/DELETE) trên các bảng nghiệp vụ → ghi `audit_logs`.
- `tg_protect_columns`: chặn client sửa cột hệ thống (`created_by`, `version`, `ledger_id`, `owner_user_id`…).

**Khoá ngoại**: FK tới `users` dùng `on delete set null` (cột người tạo) hoặc `cascade` (quan hệ sở hữu), để **xoá được tài khoản**.

---

## 2. Tổng quan 25 bảng

| Nhóm | Bảng | Ghi bởi |
|---|---|---|
| A. Master data | `currencies`, `countries`, `languages`, `time_zones`, `exchange_rates` | service_role |
| B. Người dùng & quyền | `users`, `user_preferences`, `roles`, `permissions`, `role_permissions` | user (giới hạn cột) / service_role |
| C. Sổ & thành viên | `ledgers`, `ledger_members`, `ledger_invitations` | RPC |
| D. Tiền | `financial_accounts`, `categories`, `category_rules`, `budgets`, `transactions`, `transaction_shares`, `recurring_rules` | thành viên theo quyền |
| E. Nhập liệu | `import_jobs`, `import_rows`, `documents` | thành viên + server |
| F. Hệ thống | `notifications`, `audit_logs` | server/trigger |

```
auth.users 1─1 users 1─1 user_preferences
users ─< ledger_members >─ ledgers ─< ledger_invitations
roles ─< role_permissions >─ permissions ;  ledger_members.role_code → roles
ledgers ─< financial_accounts ─< transactions >─ categories (cây parent_id)
ledgers ─< categories ─< category_rules ;  categories ─< budgets
transactions ─< transaction_shares >─ users
recurring_rules ─< transactions ;  import_jobs ─< import_rows ─ transactions
documents ─ transactions ;  users ─< notifications ;  audit_logs (ghi lại mọi thay đổi)
```

---

## A. Master data

### A1. `currencies` — Tiền tệ ISO 4217
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | char(3) | ❌ | | **PK**. `JPY`, `VND`, `USD`… |
| `numeric_code` | char(3) | ❌ | | UNIQUE. `392` |
| `name` | varchar(100) | ❌ | | Tên tiếng Anh |
| `name_i18n` | jsonb | ❌ | `'{}'` | `{"ja":"日本円","vi":"Yên Nhật"}` |
| `symbol` | varchar(10) | ❌ | | `¥`, `₫` |
| `decimal_places` | smallint | ❌ | | 0–4. JPY/VND = 0. `lib/money.ts` đọc từ đây |
| `is_active` | boolean | ❌ | `true` | Hiện trong dropdown |
| `sort_order` | smallint | ❌ | `0` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

Seed: JPY, VND, USD, EUR, GBP, SGD, AUD, KRW, CNY, THB.

### A2. `countries` — Quốc gia ISO 3166
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | char(2) | ❌ | | **PK**. `JP`, `VN` |
| `code3` | char(3) | ❌ | | UNIQUE |
| `name` | varchar(100) | ❌ | | |
| `native_name` | varchar(100) | ✅ | | `日本`, `Việt Nam` |
| `currency_code` | char(3) | ❌ | | FK → `currencies.code` |
| `default_timezone_code` | varchar(64) | ✅ | | FK → `time_zones.code` |
| `default_locale` | varchar(10) | ✅ | | `ja-JP` |
| `phone_code` | varchar(8) | ✅ | | `+81` |
| `is_active` | boolean | ❌ | `true` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A3. `languages` — Ngôn ngữ giao diện
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(10) | ❌ | | **PK**. `ja`, `vi`, `en` |
| `locale` | varchar(10) | ❌ | | UNIQUE. `ja-JP` |
| `name` | varchar(50) | ❌ | | `Japanese` |
| `native_name` | varchar(50) | ❌ | | `日本語` |
| `is_active` | boolean | ❌ | `true` | |
| `is_default` | boolean | ❌ | `false` | Partial UNIQUE: chỉ 1 dòng `true` (`ja`) |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A4. `time_zones` — Múi giờ IANA
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(64) | ❌ | | **PK**. `Asia/Tokyo` |
| `name` | varchar(100) | ❌ | | `Japan Standard Time` |
| `utc_offset_minutes` | smallint | ❌ | | Chỉ để hiển thị; tính toán dùng tên IANA |
| `country_code` | char(2) | ✅ | | FK → `countries.code` |
| `is_active` | boolean | ❌ | `true` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A5. `exchange_rates` — Tỷ giá theo ngày
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `base_currency` | char(3) | ❌ | | FK → `currencies.code` |
| `quote_currency` | char(3) | ❌ | | FK → `currencies.code`. CHECK khác `base_currency` |
| `rate` | numeric(20,10) | ❌ | | CHECK `> 0`. 1 base = rate quote |
| `rate_date` | date | ❌ | | Ngày áp dụng |
| `source` | varchar(30) | ❌ | `'api'` | `api` / `manual` |
| `fetched_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(base_currency, quote_currency, rate_date, source)`. **Chỉ service_role ghi** (Edge Function lấy tỷ giá hằng ngày); client chỉ đọc. Thay cho `FXService` gọi API trực tiếp từ trình duyệt.

---

## B. Người dùng & quyền

### B1. `users` — Hồ sơ người dùng (1-1 với `auth.users`)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | | **PK = `auth.users.id`**, FK `on delete cascade` |
| `email` | citext | ❌ | | UNIQUE. **Đồng bộ từ `auth.users` bằng trigger, client không sửa được** |
| `display_name` | varchar(100) | ❌ | | Mặc định = phần trước `@` của email |
| `first_name` | varchar(100) | ✅ | | |
| `last_name` | varchar(100) | ✅ | | |
| `avatar_path` | text | ✅ | | Đường dẫn trong bucket `avatars` (không lưu URL công khai) |
| `phone` | varchar(30) | ✅ | | |
| `birth_date` | date | ✅ | | |
| `gender` | varchar(20) | ✅ | | `male / female / other / prefer_not_to_say` |
| `country_code` | char(2) | ✅ | | FK → `countries.code` |
| `status` | varchar(20) | ❌ | `'active'` | `active / disabled`. Client không sửa được |
| `onboarded_at` | timestamptz | ✅ | | Set khi xong onboarding → quyết định chuyển hướng `/onboarding` |
| `last_seen_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

Trigger: `on_auth_user_created` → tạo `users` + `user_preferences`; `on_auth_user_email_changed` → đồng bộ `email`.
Client được sửa: `display_name, first_name, last_name, avatar_path, phone, birth_date, gender, country_code`.

### B2. `user_preferences` — Cài đặt cá nhân (1-1)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `user_id` | uuid | ❌ | | **PK**, FK → `users.id` cascade |
| `language_code` | varchar(10) | ❌ | `'ja'` | FK → `languages.code`. Nút chọn ngôn ngữ ở Sidebar ghi vào đây |
| `locale` | varchar(10) | ❌ | `'ja-JP'` | Định dạng số/ngày |
| `timezone_code` | varchar(64) | ❌ | `'Asia/Tokyo'` | FK → `time_zones.code` |
| `default_currency_code` | char(3) | ❌ | `'JPY'` | FK. Tiền tệ đề xuất khi tạo sổ mới |
| `default_ledger_id` | uuid | ✅ | | FK → `ledgers.id` `on delete set null`. Sổ mở khi đăng nhập (thay `localStorage lastMembershipContext`) |
| `date_format` | varchar(20) | ❌ | `'yyyy-MM-dd'` | `yyyy-MM-dd / dd/MM/yyyy / yyyy年M月d日` |
| `week_starts_on` | smallint | ❌ | `0` | 0 = Chủ nhật (lịch Nhật), 1 = Thứ hai |
| `theme` | varchar(10) | ❌ | `'system'` | `light / dark / system` |
| `dashboard_density` | varchar(15) | ❌ | `'comfortable'` | `comfortable / compact` |
| `hide_balances` | boolean | ❌ | `false` | Ẩn số tiền (chế độ riêng tư) |
| `start_page` | varchar(50) | ❌ | `'/'` | Trang mở sau đăng nhập |
| `notification_settings` | jsonb | ❌ | *xem dưới* | Ma trận loại thông báo × kênh |
| `updated_at` | timestamptz | ❌ | `now()` | |

`notification_settings` mặc định:
```json
{ "budget_warning": {"in_app": true, "email": true},
  "budget_exceeded": {"in_app": true, "email": true},
  "import_done": {"in_app": true, "email": false},
  "recurring_due": {"in_app": true, "email": false},
  "member_activity": {"in_app": true, "email": false},
  "weekly_summary": {"in_app": false, "email": true} }
```

### B3. `roles` — Vai trò trong sổ
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(20) | ❌ | | **PK**. `OWNER / ADMIN / MEMBER / VIEWER` |
| `name_i18n` | jsonb | ❌ | | `{"ja":"オーナー","vi":"Chủ sổ","en":"Owner"}` |
| `description_i18n` | jsonb | ❌ | `'{}'` | Hiện trong modal mời |
| `rank` | smallint | ❌ | | 400/300/200/100 — so sánh "ít nhất ADMIN" |
| `is_assignable` | boolean | ❌ | `true` | OWNER = `false` (chỉ đổi qua RPC chuyển quyền sở hữu) |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### B4. `permissions` — Quyền nguyên tử
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(50) | ❌ | | **PK**. Dạng `resource.action`: `transaction.create` |
| `resource` | varchar(30) | ❌ | | `ledger, member, account, category, transaction, budget, recurring, import, report` |
| `action` | varchar(20) | ❌ | | `read, create, update, delete, invite, export, manage` |
| `description` | text | ✅ | | |

### B5. `role_permissions` — Vai trò ↔ quyền
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `role_code` | varchar(20) | ❌ | | FK → `roles.code`. PK ghép |
| `permission_code` | varchar(50) | ❌ | | FK → `permissions.code`. PK ghép |

Ma trận seed:

| Quyền | OWNER | ADMIN | MEMBER | VIEWER |
|---|:-:|:-:|:-:|:-:|
| `ledger.read` | ✅ | ✅ | ✅ | ✅ |
| `ledger.update` | ✅ | ✅ | | |
| `ledger.delete` | ✅ | | | |
| `member.invite / member.update / member.remove` | ✅ | ✅ | | |
| `account.* / category.* / budget.* / recurring.*` (create/update/delete) | ✅ | ✅ | ✅ | |
| `transaction.create / transaction.update` | ✅ | ✅ | ✅ | |
| `transaction.delete` | ✅ | ✅ | | |
| `import.create` | ✅ | ✅ | ✅ | |
| `report.read` | ✅ | ✅ | ✅ | ✅ |
| `report.export` | ✅ | ✅ | ✅ | |

Hàm RLS: `has_ledger_permission(p_ledger_id uuid, p_permission varchar) returns boolean` (SECURITY DEFINER, `search_path=public`, chỉ cấp EXECUTE cho `authenticated`).

---

## C. Sổ & thành viên

### C1. `ledgers` — Sổ (thay tenants/households/organizations)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `name` | varchar(100) | ❌ | | `個人財務`, `Gia đình` |
| `ledger_type` | varchar(20) | ❌ | `'personal'` | `personal / family / business / freelance` (bước "Mục đích" ở onboarding) |
| `currency_code` | char(3) | ❌ | | FK. **Tiền tệ gốc — nguồn duy nhất cho mọi hiển thị số tiền** (thay "Mock Ledger USD") |
| `timezone_code` | varchar(64) | ❌ | | FK → `time_zones.code` |
| `country_code` | char(2) | ✅ | | FK → `countries.code` |
| `locale` | varchar(10) | ❌ | | |
| `fiscal_year_start_month` | smallint | ❌ | `1` | 1–12. Doanh nghiệp Nhật = 4 |
| `icon` | varchar(50) | ✅ | | Tên icon lucide |
| `color` | varchar(9) | ✅ | | |
| `owner_user_id` | uuid | ❌ | | FK → `users.id`. Chỉ đổi qua RPC `transfer_ledger_ownership` |
| `status` | varchar(20) | ❌ | `'active'` | `active / archived` |
| *AUDIT* | | | | |

Tạo **chỉ qua RPC** `create_ledger(...)` hoặc `setup_onboarding(...)` (insert sổ + thành viên OWNER + danh mục mặc định + tài khoản "Tiền mặt" trong 1 transaction).

### C2. `ledger_members` — Thành viên của sổ
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK → `ledgers.id` cascade |
| `user_id` | uuid | ❌ | | FK → `users.id` cascade |
| `role_code` | varchar(20) | ❌ | `'MEMBER'` | FK → `roles.code` |
| `status` | varchar(20) | ❌ | `'active'` | `active / left / removed` |
| `color` | varchar(9) | ✅ | | Màu avatar trong sổ (cột "ユーザー" ở bảng giao dịch) |
| `joined_at` | timestamptz | ❌ | `now()` | |
| `left_at` | timestamptz | ✅ | | |
| `invitation_id` | uuid | ✅ | | FK → `ledger_invitations.id`. Vào sổ qua lời mời nào |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, user_id)`. Mời lại người đã `left/removed` → RPC **kích hoạt lại** dòng cũ thay vì insert (sửa lỗi `duplicate key`).
Ràng buộc: mỗi sổ có đúng 1 thành viên `role_code='OWNER'` và `status='active'` (partial UNIQUE + trigger).

### C3. `ledger_invitations` — Lời mời
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK → `ledgers.id` cascade |
| `email` | citext | ❌ | | Mời được **cả email chưa đăng ký** |
| `role_code` | varchar(20) | ❌ | `'MEMBER'` | FK → `roles.code`. CHECK `<> 'OWNER'` |
| `token_hash` | text | ❌ | | UNIQUE. SHA-256 của token; token gốc chỉ trả về 1 lần cho người mời (link `/join?token=`) |
| `status` | varchar(20) | ❌ | `'pending'` | `pending / accepted / declined / revoked / expired` |
| `expires_at` | timestamptz | ❌ | `now() + 7 days` | |
| `invited_by` | uuid | ✅ | | FK → `users.id` set null |
| `accepted_by` | uuid | ✅ | | FK → `users.id` set null |
| `responded_at` | timestamptz | ✅ | | |
| `message` | text | ✅ | | Lời nhắn kèm theo |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

Partial UNIQUE `(ledger_id, email) where status = 'pending'`. `token_hash` **không** đọc được qua RLS.

---

## D. Tiền

### D1. `financial_accounts` — Ví / ngân hàng / thẻ
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK → `ledgers.id` cascade |
| `name` | varchar(100) | ❌ | | `PayPay`, `三井住友銀行 普通` |
| `account_type` | varchar(20) | ❌ | | `cash / bank / credit_card / e_wallet / investment / loan / other` |
| `provider_code` | varchar(30) | ✅ | | `paypay, paypay_card, rakuten_pay, smbc, mufg, vcb, mbbank, generic_csv` — khớp `lib/constants.ts PROVIDERS` và bộ parser |
| `institution_name` | varchar(100) | ✅ | | |
| `account_number_last4` | varchar(4) | ✅ | | Không lưu số tài khoản đầy đủ |
| `currency_code` | char(3) | ❌ | | FK. Mặc định = tiền tệ của sổ |
| `opening_balance` | numeric(20,4) | ❌ | `0` | Số dư đầu kỳ (có thể âm với thẻ tín dụng) |
| `opening_date` | date | ❌ | `current_date` | |
| `credit_limit` | numeric(20,4) | ✅ | | Chỉ thẻ tín dụng |
| `color` | varchar(9) | ✅ | | Màu chip tài khoản |
| `icon` | varchar(50) | ✅ | | |
| `include_in_net_worth` | boolean | ❌ | `true` | Tính vào "総残高" |
| `is_archived` | boolean | ❌ | `false` | |
| `sort_order` | smallint | ❌ | `0` | |
| *AUDIT* | | | | |

Số dư hiện tại **không lưu**, tính bằng view `v_account_balances`.

### D2. `categories` — Danh mục (cây)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK → `ledgers.id` cascade |
| `parent_id` | uuid | ✅ | | FK → `categories.id`. Trigger: cùng `ledger_id`, sâu tối đa 3 cấp, không vòng lặp |
| `slug` | varchar(80) | ❌ | | UNIQUE `(ledger_id, slug)`. Dùng cho URL `/categories/[slug]` |
| `name` | varchar(100) | ❌ | | |
| `name_i18n` | jsonb | ❌ | `'{}'` | Tên theo ngôn ngữ (danh mục mặc định) |
| `category_type` | varchar(20) | ❌ | `'expense'` | `expense / income / transfer` |
| `icon` | varchar(50) | ✅ | | Tên icon lucide (thay emoji) |
| `color` | varchar(9) | ✅ | | |
| `sort_order` | smallint | ❌ | `0` | |
| `is_system` | boolean | ❌ | `false` | `未分類`, `振替` — không xoá được |
| `is_shared` | boolean | ❌ | `false` | Danh mục chia tiền giữa thành viên (tab "Số dư / Thành viên") |
| `is_archived` | boolean | ❌ | `false` | Tab "Lưu trữ" |
| `archived_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

Seed khi tạo sổ: 食費, 交通, 買い物, 娯楽, 医療・健康, 光熱費, 住居, 通信, 給与, その他収入, 振替, 未分類 (thay hằng số `CATEGORIES` trong code).
Gộp danh mục: RPC `merge_categories(source_id, target_id)` chuyển giao dịch, quy tắc, ngân sách rồi lưu trữ nguồn.

### D3. `category_rules` — Từ khoá tự phân loại
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `category_id` | uuid | ❌ | | FK → `categories.id` cascade |
| `match_field` | varchar(20) | ❌ | `'description'` | `description / merchant` |
| `match_type` | varchar(20) | ❌ | `'contains'` | `contains / equals / starts_with / regex` |
| `pattern` | varchar(200) | ❌ | | `starbucks`, `セブン` (so khớp không phân biệt hoa/thường, đã chuẩn hoá full/half-width) |
| `account_id` | uuid | ✅ | | Chỉ áp cho 1 tài khoản |
| `amount_min` | numeric(20,4) | ✅ | | |
| `amount_max` | numeric(20,4) | ✅ | | |
| `transaction_type` | varchar(20) | ✅ | | Chỉ áp cho chi / thu |
| `priority` | smallint | ❌ | `100` | Nhỏ hơn chạy trước |
| `is_active` | boolean | ❌ | `true` | |
| `hit_count` | integer | ❌ | `0` | Hiện "đã khớp N lần" |
| `last_matched_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, match_field, match_type, pattern)`. Áp dụng phía server bằng RPC `apply_category_rules(ledger_id, transaction_ids[])` (khi import, khi bấm "Áp dụng N gợi ý").

### D4. `budgets` — Ngân sách
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `category_id` | uuid | ✅ | | FK → `categories.id` cascade. `NULL` = ngân sách tổng của sổ |
| `period_type` | varchar(10) | ❌ | `'monthly'` | `monthly / yearly` |
| `period_start` | date | ✅ | | `NULL` = áp mọi kỳ; có giá trị = chỉ kỳ đó (ghi đè) |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `warning_threshold_pct` | smallint | ❌ | `80` | 1–100. Vượt → thông báo `budget_warning` |
| `rollover` | boolean | ❌ | `false` | Chuyển phần dư sang kỳ sau |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, category_id, period_type, period_start)` (NULLS NOT DISTINCT).

### D5. `transactions` — Giao dịch
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK → `ledgers.id` cascade |
| `account_id` | uuid | ❌ | | FK → `financial_accounts.id`. Tài khoản phát sinh |
| `transfer_account_id` | uuid | ✅ | | FK. Bắt buộc khi `transaction_type='transfer'` (tài khoản nhận) |
| `transaction_type` | varchar(20) | ❌ | | `expense / income / transfer` |
| `status` | varchar(20) | ❌ | `'posted'` | `pending / posted / void` (pending = định kỳ chờ xác nhận) |
| `amount` | numeric(20,4) | ❌ | | **CHECK `> 0`** (luôn dương) |
| `currency_code` | char(3) | ❌ | | FK. Tiền tệ gốc của giao dịch |
| `exchange_rate` | numeric(20,10) | ❌ | `1` | Quy đổi sang tiền của sổ |
| `base_amount` | numeric(20,4) | ❌ | | = `amount × exchange_rate` (trigger tính). Mọi báo cáo dùng cột này |
| `transaction_date` | date | ❌ | | Ngày giao dịch (múi giờ của sổ) |
| `transaction_time` | time | ✅ | | |
| `description` | text | ❌ | | Nội dung gốc từ ngân hàng / người nhập |
| `merchant_name` | varchar(200) | ✅ | | Tên cửa hàng đã làm sạch |
| `category_id` | uuid | ✅ | | FK → `categories.id` set null. `NULL` = chưa phân loại |
| `categorized_by` | varchar(10) | ✅ | | `manual / rule / ai / import` — tab "Tự động / Cần xem lại" |
| `category_rule_id` | uuid | ✅ | | FK → `category_rules.id` set null |
| `needs_review` | boolean | ❌ | `false` | Badge "Cần xem lại" |
| `notes` | text | ✅ | | Ghi chú của người dùng |
| `tags` | text[] | ❌ | `'{}'` | Nhãn tự do (GIN index) |
| `paid_by_user_id` | uuid | ✅ | | FK → `users.id` set null. Người trả (cột "ユーザー"), mặc định = người tạo |
| `source` | varchar(20) | ❌ | `'manual'` | `manual / import / scan / recurring` |
| `import_job_id` | uuid | ✅ | | FK → `import_jobs.id` set null |
| `document_id` | uuid | ✅ | | FK → `documents.id` set null (ảnh hoá đơn) |
| `recurring_rule_id` | uuid | ✅ | | FK → `recurring_rules.id` set null |
| `recurring_occurrence` | date | ✅ | | Kỳ định kỳ đã sinh |
| `external_id` | varchar(255) | ✅ | | Mã giao dịch từ ngân hàng |
| `dedupe_hash` | char(64) | ✅ | | SHA-256(`account_id|date|amount|description`) khi không có `external_id` |
| `exclude_from_reports` | boolean | ❌ | `false` | Ví dụ: nạp tiền PayPay từ thẻ (tránh tính chi 2 lần) |
| `raw_data` | jsonb | ✅ | | Dòng gốc khi import ("元データ" trong panel chi tiết) |
| *AUDIT* | | | | |

Ràng buộc & index:
- CHECK `(transaction_type = 'transfer') = (transfer_account_id is not null)`; CHECK `transfer_account_id <> account_id`.
- Partial UNIQUE `(account_id, external_id) where external_id is not null and deleted_at is null`.
- Partial UNIQUE `(account_id, dedupe_hash) where dedupe_hash is not null and deleted_at is null`.
- Partial UNIQUE `(recurring_rule_id, recurring_occurrence) where recurring_rule_id is not null`.
- Index: `(ledger_id, transaction_date desc)`, `(ledger_id, category_id, transaction_date)`, `(account_id, transaction_date)`, GIN `tags`, trigram `description` (tìm kiếm).
- Trigger: `category_id` và `account_id` phải cùng `ledger_id`; tính `base_amount`; kiểm tra ngân sách → tạo `notifications`.

### D6. `transaction_shares` — Chia tiền giữa thành viên
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `transaction_id` | uuid | ❌ | | FK → `transactions.id` cascade |
| `user_id` | uuid | ❌ | | FK → `users.id` cascade. Phải là thành viên của sổ |
| `share_amount` | numeric(20,4) | ❌ | | Phần phải chịu. Tổng = `transactions.amount` (trigger kiểm tra) |
| `is_settled` | boolean | ❌ | `false` | Đã thanh toán lại cho người trả |
| `settled_at` | timestamptz | ✅ | | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(transaction_id, user_id)`. Chỉ dùng cho giao dịch thuộc danh mục `is_shared = true`. Nguồn cho tab "Số dư từng người / Bạn đã trả".

### D7. `recurring_rules` — Giao dịch định kỳ
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `name` | varchar(100) | ❌ | | `家賃`, `Netflix` |
| `transaction_type` | varchar(20) | ❌ | `'expense'` | `expense / income / transfer` |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `currency_code` | char(3) | ❌ | | FK |
| `account_id` | uuid | ❌ | | FK → `financial_accounts.id` |
| `transfer_account_id` | uuid | ✅ | | Khi là chuyển khoản |
| `category_id` | uuid | ✅ | | FK → `categories.id` set null |
| `description` | text | ❌ | | Nội dung giao dịch sinh ra |
| `notes` | text | ✅ | | |
| `frequency` | varchar(10) | ❌ | `'monthly'` | `daily / weekly / monthly / yearly` |
| `interval_count` | smallint | ❌ | `1` | Mỗi N kỳ |
| `day_of_month` | smallint | ✅ | | 1–31; ngày không tồn tại → ngày cuối tháng |
| `day_of_week` | smallint | ✅ | | 0–6 |
| `month_of_year` | smallint | ✅ | | 1–12 |
| `start_date` | date | ❌ | | |
| `end_date` | date | ✅ | | |
| `next_run_date` | date | ❌ | | Cron server đọc cột này |
| `last_generated_date` | date | ✅ | | |
| `auto_post` | boolean | ❌ | `true` | `false` → sinh giao dịch `status='pending'` chờ xác nhận |
| `is_active` | boolean | ❌ | `true` | Nút bật/tắt ở màn Định kỳ |
| *AUDIT* | | | | |

Sinh giao dịch bằng `pg_cron` (hoặc Edge Function) mỗi ngày, idempotent nhờ UNIQUE `(recurring_rule_id, recurring_occurrence)`. Thay cho `applied_months` tính ở client.

---

## E. Nhập liệu

### E1. `import_jobs` — Một lần import file
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `account_id` | uuid | ❌ | | FK → `financial_accounts.id`. Import vào tài khoản nào |
| `provider_code` | varchar(30) | ❌ | | Parser đã dùng (tự nhận diện hoặc người dùng chọn) |
| `file_name` | varchar(255) | ❌ | | |
| `file_type` | varchar(10) | ❌ | | `csv / pdf` |
| `file_path` | text | ✅ | | Đường dẫn trong bucket `imports` (tuỳ chọn lưu) |
| `file_size` | integer | ✅ | | byte |
| `checksum` | char(64) | ❌ | | SHA-256 file. Cảnh báo "file này đã import ngày …" |
| `column_mapping` | jsonb | ✅ | | Mapping cột cho CSV chung |
| `status` | varchar(20) | ❌ | `'parsed'` | `parsed / importing / completed / failed / cancelled` |
| `total_rows` | integer | ❌ | `0` | |
| `imported_rows` | integer | ❌ | `0` | |
| `duplicate_rows` | integer | ❌ | `0` | |
| `skipped_rows` | integer | ❌ | `0` | Người dùng bỏ chọn |
| `error_rows` | integer | ❌ | `0` | |
| `error_message` | text | ✅ | | |
| `completed_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

### E2. `import_rows` — Từng dòng đã parse
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `import_job_id` | uuid | ❌ | | FK → `import_jobs.id` cascade |
| `row_number` | integer | ❌ | | |
| `raw_data` | jsonb | ❌ | | Dòng gốc |
| `parsed_date` | date | ✅ | | |
| `parsed_amount` | numeric(20,4) | ✅ | | Luôn dương |
| `parsed_type` | varchar(20) | ✅ | | `expense / income / transfer` |
| `parsed_description` | text | ✅ | | |
| `suggested_category_id` | uuid | ✅ | | FK set null (từ `category_rules`) |
| `status` | varchar(20) | ❌ | `'new'` | `new / duplicate / error / skipped / imported` |
| `duplicate_of_id` | uuid | ✅ | | FK → `transactions.id` set null |
| `transaction_id` | uuid | ✅ | | FK → `transactions.id` set null. Giao dịch đã tạo |
| `error_message` | text | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(import_job_id, row_number)`. Tự xoá sau 90 ngày (cron), giữ `import_jobs`.

### E3. `documents` — Ảnh hoá đơn và kết quả OCR
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `document_type` | varchar(20) | ❌ | `'receipt'` | `receipt / invoice / statement / other` |
| `storage_path` | text | ❌ | | Đường dẫn trong bucket riêng tư `receipts` |
| `file_name` | varchar(255) | ❌ | | |
| `mime_type` | varchar(50) | ❌ | | `image/jpeg, image/png, image/heic, application/pdf` |
| `file_size` | integer | ❌ | | ≤ 10 MB |
| `ocr_status` | varchar(20) | ❌ | `'pending'` | `pending / processing / done / failed` |
| `ocr_provider` | varchar(30) | ✅ | | `gemini` |
| `ocr_model` | varchar(50) | ✅ | | |
| `ocr_result` | jsonb | ✅ | | JSON gốc AI trả về (dòng hàng, thuế…) |
| `extracted_merchant` | varchar(200) | ✅ | | |
| `extracted_date` | date | ✅ | | |
| `extracted_total` | numeric(20,4) | ✅ | | |
| `extracted_currency` | char(3) | ✅ | | |
| `confidence` | numeric(4,3) | ✅ | | 0–1 |
| `error_message` | text | ✅ | | |
| `transaction_id` | uuid | ✅ | | FK → `transactions.id` set null. Giao dịch đã tạo từ hoá đơn |
| *AUDIT* | | | | |

---

## F. Hệ thống

### F1. `notifications` — Thông báo trong app
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | | FK → `users.id` cascade. Người nhận |
| `ledger_id` | uuid | ✅ | | FK cascade |
| `type` | varchar(30) | ❌ | | `budget_warning / budget_exceeded / import_done / recurring_due / recurring_pending / invitation / member_joined / system` |
| `title_key` | varchar(100) | ❌ | | Khoá i18n, ví dụ `notif.budget_warning.title` |
| `body_key` | varchar(100) | ❌ | | |
| `params` | jsonb | ❌ | `'{}'` | `{"category":"食費","pct":85}` — UI dịch theo ngôn ngữ hiện tại |
| `action_url` | text | ✅ | | `/categories/food` |
| `entity_type` | varchar(30) | ✅ | | |
| `entity_id` | uuid | ✅ | | |
| `read_at` | timestamptz | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |
| `expires_at` | timestamptz | ✅ | | |

Index `(user_id, read_at, created_at desc)`. Chỉ server/trigger tạo; người dùng chỉ cập nhật `read_at`.

### F2. `audit_logs` — Nhật ký hoạt động
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | bigint | ❌ | identity | PK |
| `ledger_id` | uuid | ✅ | | FK set null |
| `actor_user_id` | uuid | ✅ | | FK → `users.id` set null |
| `action` | varchar(30) | ❌ | | `create / update / delete / import / invite / join / leave / role_change / login / export` |
| `entity_type` | varchar(30) | ❌ | | `transaction / category / account / ledger / member / budget / recurring / import` |
| `entity_id` | uuid | ✅ | | |
| `summary` | text | ✅ | | Dòng mô tả ngắn cho UI |
| `old_values` | jsonb | ✅ | | Chỉ các cột thay đổi |
| `new_values` | jsonb | ✅ | | |
| `ip_address` | inet | ✅ | | |
| `user_agent` | text | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |

Chỉ INSERT qua trigger `tg_audit` / RPC; không ai UPDATE/DELETE. Index `(actor_user_id, created_at desc)`, `(ledger_id, created_at desc)`.

---

## G. View, RPC, Storage, RLS

### G1. View (thay `category_balances` và phần tính toán ở client)
| View | Cột chính | Dùng ở |
|---|---|---|
| `v_account_balances` | `account_id, ledger_id, name, account_type, currency_code, balance` (= opening + thu − chi ± chuyển khoản) | Dashboard (総残高, アカウント), màn Tài khoản |
| `v_monthly_summary` | `ledger_id, month, income, expense, net, tx_count` | Dashboard dòng tiền, Phân tích, Báo cáo tháng |
| `v_daily_summary` | `ledger_id, date, income, expense, tx_count` | Lịch |
| `v_category_monthly` | `ledger_id, category_id, month, expense, income, tx_count, budget_amount, budget_used_pct` | Danh mục, Phân tích, Báo cáo |
| `v_classification_stats` | `ledger_id, month, total, classified, needs_review, auto_pct` | KPI trang Danh mục |
| `v_member_balances` | `ledger_id, category_id, user_id, paid, owed, balance` | Tab "Số dư" danh mục chia sẻ |

Tất cả view `security_invoker = true` để RLS của bảng gốc vẫn áp dụng.

### G2. RPC (SECURITY DEFINER, tự kiểm tra quyền)
| RPC | Mô tả |
|---|---|
| `setup_onboarding(p_purpose, p_name, p_currency, p_timezone, p_locale, p_fiscal_start_month)` | Tạo sổ + OWNER + danh mục mặc định + tài khoản 現金; set `users.onboarded_at`, `default_ledger_id` |
| `create_ledger(...)` | Tạo thêm sổ (modal "新しい元帳を作成") |
| `invite_member(p_ledger_id, p_email, p_role)` → trả **token gốc 1 lần** | Kiểm tra `member.invite`, role ≠ OWNER |
| `get_invitation(p_token)` | Trang `/join` hiển thị tên sổ, người mời trước khi chấp nhận |
| `accept_invitation(p_token)` / `decline_invitation(p_token)` | Kiểm tra email khớp, còn hạn; kích hoạt lại thành viên cũ nếu có |
| `revoke_invitation(p_id)` | |
| `update_member_role(p_member_id, p_role)` | Không gán OWNER; ADMIN không sửa ADMIN khác |
| `remove_member(p_member_id)` / `leave_ledger(p_ledger_id)` | |
| `transfer_ledger_ownership(p_ledger_id, p_new_owner_user_id)` | |
| `merge_categories(p_source_id, p_target_id)` | |
| `apply_category_rules(p_ledger_id, p_transaction_ids uuid[] default null)` | Trả số giao dịch đã phân loại |
| `import_transactions(p_job_id, p_rows jsonb)` | Insert hàng loạt, bỏ trùng theo `external_id / dedupe_hash`, cập nhật đếm |
| `bulk_update_transactions(p_ids uuid[], p_patch jsonb)` / `bulk_delete_transactions(p_ids uuid[])` | Thanh thao tác hàng loạt |
| `list_my_sessions()` / `revoke_session(p_session_id)` | Đọc `auth.sessions` — thay bảng `device_verifications` |
| `delete_my_account()` | Chặn nếu còn là OWNER của sổ có thành viên khác |

### G3. Storage buckets
| Bucket | Công khai | Đường dẫn | Policy |
|---|---|---|---|
| `avatars` | Có (đọc) | `{user_id}/{uuid}.webp` | Chỉ chủ sở hữu ghi/xoá |
| `receipts` | Không | `{ledger_id}/{uuid}.{ext}` | Thành viên sổ đọc; `transaction.create` ghi |
| `imports` | Không | `{ledger_id}/{uuid}.{ext}` | Chỉ người tải lên và OWNER/ADMIN đọc |

### G4. RLS tóm tắt
| Bảng | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| Master data (A1–A5), `roles`, `permissions`, `role_permissions` | `authenticated` | service_role |
| `users` | chính mình + người cùng sổ | UPDATE chính mình, chỉ các cột cho phép |
| `user_preferences` | chính mình | chính mình |
| `ledgers` | thành viên active | qua RPC; UPDATE cần `ledger.update` |
| `ledger_members` | thành viên cùng sổ | qua RPC |
| `ledger_invitations` | người có `member.invite` (trừ `token_hash`) | qua RPC |
| D1–D7, `import_*`, `documents` | thành viên active của `ledger_id` | theo quyền ở B5 |
| `notifications` | `user_id = auth.uid()` | UPDATE `read_at` của chính mình |
| `audit_logs` | chính mình + OWNER/ADMIN của sổ | trigger |

---

## H. Bảng đã bỏ so với hiện tại / tài liệu

| Bảng | Lý do |
|---|---|
| `tenants`, `households`, `organizations`, `members` | Gộp thành `ledgers` + `ledger_members` + `ledger_invitations` |
| `fiscal_calendars`, `fiscal_periods` | Thay bằng `ledgers.fiscal_year_start_month` |
| `feature_flags`, `system_settings` | Chưa màn hình nào dùng |
| `ui_translations`, `category_translations` | `lib/i18n.ts` + `name_i18n` |
| `category_balances`, `category_budgets` | View `v_category_monthly` + bảng `budgets` |
| `recurring_transactions` | `recurring_rules` |
| `device_verifications` | `auth.sessions` qua RPC |
| Domain 03, 05, 06, 07 (phần lớn), 08, 11 (trừ notifications), 12, 13 (trừ audit_logs) | Ngoài phạm vi app; bổ sung khi có màn hình tương ứng |

## I. Thứ tự file migration

```
0001_extensions.sql            citext, pgcrypto, pg_trgm, pg_cron
0002_helpers.sql               tg_touch, tg_protect_columns
0003_master_data.sql           currencies, countries, languages, time_zones, exchange_rates
0004_users.sql                 users, user_preferences, trigger đăng ký/đổi email
0005_rbac.sql                  roles, permissions, role_permissions, has_ledger_permission()
0006_ledgers.sql               ledgers, ledger_members, ledger_invitations
0007_money.sql                 financial_accounts, categories, category_rules, budgets
0008_transactions.sql          transactions, transaction_shares, recurring_rules
0009_import_documents.sql      import_jobs, import_rows, documents
0010_system.sql                notifications, audit_logs, tg_audit
0011_views.sql                 v_* views
0012_rpc.sql                   toàn bộ RPC ở G2
0013_rls.sql                   toàn bộ policy
0014_storage.sql               buckets + policies
0015_cron.sql                  recurring, dọn import_rows, tỷ giá, hết hạn lời mời
0016_seed.sql                  master data + roles/permissions
```
