# Leo Walletly — Database Schema V2 (bản dựng lại sạch)

> Trạng thái: **ĐỀ XUẤT** — dùng làm đặc tả để viết lại toàn bộ `supabase/migrations/` trước khi xoá và tạo lại database trên Supabase.
> Thay thế: 23 migration Foundation hiện tại và các bảng cũ mà code còn gọi (`ledgers`, `ledger_members`, `transactions`, `categories`, `category_budgets`, `category_balances`, `category_translations`, `recurring_transactions`, `audit_logs`, `device_verifications`, `ui_translations`).
> Luồng màn hình: `docs/SCREEN_FLOWS.md`.

**Phiên bản 2.1** — thay đổi so với bản trước:
- **Không dùng `jsonb`**: mọi dữ liệu có cấu trúc được tách thành bảng con (xem §1.3). Không dùng mảng `text[]`.
- **Đa ngôn ngữ bằng bảng** `translation_keys` / `translations` / `translation_overrides`: thêm ngôn ngữ mới chỉ cần thêm dòng, người dùng sửa được chữ hiển thị trên màn hình.
- **Giữ bảng cho mọi màn hình đã có UI nhưng chưa nối DB** (xem §2) để làm tiếp, không phải thiết kế lại.

---

## 0. Các quyết định thiết kế

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Gộp `tenants` + `households` + `organizations` thành **`ledgers`** (có `ledger_type`). Mọi bảng nghiệp vụ chỉ có `ledger_id`. | UI chỉ có khái niệm "元帳 / sổ". Bỏ CHECK `household XOR organization` trên mọi bảng. |
| D2 | **`users.id` = `auth.users.id`**. | RLS chỉ cần `auth.uid()`. |
| D3 | **`amount` luôn dương**, chiều tiền do `transaction_type` quyết định. | Đúng tài liệu 04; tránh loạn dấu. |
| D4 | **`category_id` nằm trên `transactions`**. Chia tiền giữa **người** dùng `transaction_shares`. | App không chia 1 giao dịch nhiều danh mục. |
| D5 | Tài khoản là bảng **`financial_accounts`**; nhà cung cấp là bảng **`providers`** (thay hằng số `PROVIDERS`). | Hiện `'paypay'` bị `isUuid()` biến thành `null` khi lưu. |
| D6 | Loại danh mục = `expense / income / transfer`. | App quản lý chi tiêu cá nhân/gia đình. |
| D7 | Lời mời là bảng riêng **`ledger_invitations`**. | Mời email chưa đăng ký, mời lại được, token có hạn và chỉ lưu hash. |
| D8 | Master data dùng **mã tự nhiên làm PK** (`currencies.code`…). | FK đọc được. |
| D9 | **Không `jsonb`, không mảng.** Dữ liệu có cấu trúc → bảng con có FK; chữ đa ngôn ngữ → bảng dịch. | Dễ truy vấn, có ràng buộc, dễ mở rộng, sửa được từ UI. |
| D10 | Enum **người dùng nhìn thấy và có thể thêm** (loại sổ, loại tài khoản, kênh thông báo, nhà cung cấp) → **bảng lookup**. Enum **nội bộ** (status) → `varchar` + `CHECK`. | Thêm lựa chọn mới không cần sửa schema. |

## 1. Quy ước chung

### 1.1 Kiểu dữ liệu
- Tiền `numeric(20,4)`; tỷ giá `numeric(20,10)`; tỷ lệ `numeric(7,4)`.
- Ngày giao dịch `date` (+ `time` tuỳ chọn); mốc hệ thống `timestamptz`.
- Email `citext`. Chữ dài `text`, chữ ngắn `varchar(n)`.

### 1.2 Khối cột AUDIT
Bảng ghi *AUDIT* có đủ 6 cột:

| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `created_at` | timestamptz | ❌ | `now()` | |
| `updated_at` | timestamptz | ❌ | `now()` | Trigger `tg_touch` |
| `deleted_at` | timestamptz | ✅ | | Xoá mềm. RLS/UNIQUE lọc `deleted_at is null` |
| `created_by` | uuid | ✅ | `auth.uid()` | FK → `users.id` `on delete set null` |
| `updated_by` | uuid | ✅ | | Trigger gán `auth.uid()` |
| `version` | integer | ❌ | `1` | Khoá lạc quan |

Trigger chung: `tg_touch` (BEFORE UPDATE), `tg_audit` (AFTER I/U/D → `audit_logs` + `audit_log_changes`), `tg_protect_columns` (chặn client sửa cột hệ thống).

### 1.3 Thay thế jsonb (so với bản 2.0)

| Trước (jsonb / mảng) | Nay |
|---|---|
| `metadata jsonb` trên mọi bảng | **Bỏ.** Cần thêm thông tin → thêm cột có tên |
| `*.name_i18n`, `roles.description_i18n` | Cột `name_key` / `description_key` → `translation_keys` (§B) |
| `categories.name_i18n` | `name_key` (danh mục mặc định) + bảng `category_translations` (tên người dùng tự dịch) |
| `user_preferences.notification_settings` | `notification_categories` × `notification_channels` → `user_notification_settings` |
| `notifications.params` | `notification_params` (tên–giá trị) |
| `import_jobs.column_mapping` | `import_column_mappings` (lưu được làm preset theo tài khoản) |
| `import_rows.raw_data`, `transactions.raw_data` | `import_row_values` (từng ô của dòng gốc) + `transactions.import_row_id` |
| `documents.ocr_result` | Cột `extracted_*` + `ocr_raw_text` + bảng `document_line_items` |
| `audit_logs.old_values / new_values` | `audit_log_changes` (1 dòng / cột thay đổi) |
| `transactions.tags text[]` | `tags` + `transaction_tags` |
| `PROVIDERS.fileTypes` (mảng trong code) | Cột `supports_csv`, `supports_pdf`, `supports_api` trong `providers` |

---

## 2. Kiểm kê: màn hình có UI nhưng chưa nối DB → bảng được giữ

| # | Màn hình / thành phần | Hiện trạng code | Bảng giữ / thêm | Giai đoạn |
|---|---|---|---|---|
| 1 | `/notifications` + chuông TopBar | Mảng `NOTIFICATIONS` / `DEMO_NOTIFS` cứng (5 loại: Budget, Import, Report, Insight, Recurring) | `notifications`, `notification_params`, `notification_types`, `notification_categories` | 2 |
| 2 | `/settings/notifications` | Ma trận 4 nhóm (security, billing, transactions, product_updates) × 4 kênh (email, push, sms, inApp); ghi vào cột không tồn tại | `notification_channels`, `user_notification_settings` | 2 |
| 3 | `/settings/security` | Danh sách phiên (thiết bị, trình duyệt, OS, IP, vị trí, rủi ro) đọc bảng `device_verifications` không tồn tại; MFA/passkey luôn `false`; đổi mật khẩu, xoá tài khoản chưa làm | `user_sessions` (+ Supabase Auth MFA) | 2 |
| 4 | `/settings/audit-log` | Đọc `audit_logs` không tồn tại | `audit_logs`, `audit_log_changes` | 2 |
| 5 | `/settings/appearance` | Theme chỉ là `useState` | `user_preferences.theme` | 1 |
| 6 | `/settings/localization` | Chỉ lưu localStorage (`useSettingsStore`) | `user_preferences`, `languages`, `time_zones` | 1 |
| 7 | `/settings/account` | Ghi sai tên cột, sai `user_id` | `user_preferences` | 1 |
| 8 | `/settings/connected-apps`, `/profile` mục "連携アカウント", nguồn "Kết nối ngân hàng" ở chi tiết danh mục | Trang `ComingSoon`, nút không có đường dẫn | `bank_connections` | 3 |
| 9 | `/settings/devices` | `ComingSoon` | `user_sessions` (dùng chung #3) | 2 |
| 10 | `/settings/privacy` | `ComingSoon` | `data_requests` (xuất dữ liệu / xoá tài khoản) | 3 |
| 11 | Menu TopBar "開発者ツール" | Mục bị khoá, không có trang | `api_tokens` | 3 |
| 12 | Dashboard: panel "ユーザー", nút "取引を追加", "招待" | Dữ liệu giả; nút bị tắt | `ledger_members`, `transactions` | 1 |
| 13 | Chi tiết danh mục: tab **メンバー** ("chủ nhóm"), **残高** ("Số dư từng người", "Trung bình / người", "Bạn đã trả"), "Liên kết tài khoản", "Quy tắc mới", "Tự động khớp" | Tính giả từ số thành viên; nút không có hành động | `category_members`, `transaction_shares`, `settlements`, `category_accounts`, `category_rules` | 2 |
| 14 | Trang Danh mục: KPI "Chờ đối soát", ô mẫu "Du lịch / Hộ gia đình / Đám cưới", dải lưu trữ | KPI đọc bảng cũ; mẫu chỉ là chữ | `transactions.is_reconciled…`, `category_templates`, `category_template_items`, `categories.archived_at` | 2 |
| 15 | Thanh chọn nhiều ở `/transactions`: "Đổi tài khoản", "Đổi danh mục" | Nút bị tắt | RPC `bulk_update_transactions` | 1 |
| 16 | `/import`: thẻ nhà cung cấp theo vùng JP / VN / Global, mô tả 3 ngôn ngữ | Hằng số `PROVIDERS` trong `lib/constants.ts` | `providers` | 1 |
| 17 | `/recurring` | Đọc bảng cũ `recurring_transactions` | `recurring_rules` | 1 |
| 18 | `/analytics`: `BudgetProgress` được import; chuỗi "予算アラート" có sẵn | Chưa hiển thị | `budgets` | 2 |
| 19 | Mời thành viên: chuỗi i18n có vai trò **会計士 (accountant)**, **監査人 (auditor)** | Chưa có trong seed | `roles` seed thêm `ACCOUNTANT`, `AUDITOR` | 1 |
| 20 | `/api/translations` + `useTranslation` | Đọc bảng `ui_translations` đã bị xoá, rơi về file tĩnh | `translation_keys`, `translations`, `translation_overrides` | 1 |

Giai đoạn: 1 = làm cùng đợt dựng lại DB · 2 = ngay sau khi luồng chính chạy · 3 = tạo bảng sẵn, làm UI sau.

---

## 3. Tổng quan (54 bảng)

| Nhóm | Bảng |
|---|---|
| A. Master data (7) | `currencies`, `countries`, `languages`, `time_zones`, `exchange_rates`, `providers`, `account_types` |
| B. Đa ngôn ngữ (3) | `translation_keys`, `translations`, `translation_overrides` |
| C. Người dùng & quyền (6) | `users`, `user_preferences`, `user_sessions`, `roles`, `permissions`, `role_permissions` |
| D. Sổ (4) | `ledger_types`, `ledgers`, `ledger_members`, `ledger_invitations` |
| E. Tiền (17) | `financial_accounts`, `category_kinds`, `categories`, `category_translations`, `category_members`, `category_accounts`, `category_rules`, `category_templates`, `category_template_items`, `budgets`, `tags`, `transactions`, `transaction_tags`, `transaction_shares`, `settlements`, `recurring_rules`, `bank_connections` |
| F. Nhập liệu (6) | `import_jobs`, `import_column_mappings`, `import_rows`, `import_row_values`, `documents`, `document_line_items` |
| G. Thông báo & nhật ký (9) | `notification_categories`, `notification_channels`, `notification_defaults`, `notification_types`, `user_notification_settings`, `notifications`, `notification_params`, `audit_logs`, `audit_log_changes` |
| H. Quyền riêng tư & nhà phát triển (2) | `data_requests`, `api_tokens` |

```
auth.users 1─1 users 1─1 user_preferences ;  users ─< user_sessions
users ─< ledger_members >─ ledgers ─< ledger_invitations ;  ledgers → ledger_types
roles ─< role_permissions >─ permissions
translation_keys ─< translations >─ languages ;  translation_keys ─< translation_overrides
ledgers ─< financial_accounts → providers, account_types
ledgers ─< categories ─< category_rules / category_members / category_accounts / category_translations / budgets
transactions → financial_accounts, categories ;  transactions ─< transaction_tags >─ tags
transactions ─< transaction_shares ;  ledgers ─< settlements
import_jobs ─< import_rows ─< import_row_values ;  import_rows ─ transactions
documents ─< document_line_items ;  documents ─ transactions
notification_types → notification_categories ;  users ─< user_notification_settings >─ notification_channels
users ─< notifications ─< notification_params ;  audit_logs ─< audit_log_changes
```

---

## A. Master data

### A1. `currencies`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | char(3) | ❌ | | **PK**. `JPY`, `VND` |
| `numeric_code` | char(3) | ❌ | | UNIQUE |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` (`currency.JPY.name`) |
| `symbol` | varchar(10) | ❌ | | `¥`, `₫` |
| `decimal_places` | smallint | ❌ | | 0–4. `lib/money.ts` đọc từ đây |
| `is_active` | boolean | ❌ | `true` | |
| `sort_order` | smallint | ❌ | `0` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A2. `countries`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | char(2) | ❌ | | **PK** |
| `code3` | char(3) | ❌ | | UNIQUE |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` |
| `currency_code` | char(3) | ❌ | | FK → `currencies.code` |
| `default_timezone_code` | varchar(64) | ✅ | | FK → `time_zones.code` |
| `default_locale` | varchar(10) | ✅ | | `ja-JP` |
| `phone_code` | varchar(8) | ✅ | | |
| `is_active` | boolean | ❌ | `true` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A3. `languages` — thêm ngôn ngữ mới = thêm 1 dòng
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(10) | ❌ | | **PK**. `ja`, `vi`, `en`, sau này `ko`, `zh-TW`… |
| `locale` | varchar(10) | ❌ | | UNIQUE. `ja-JP` |
| `name` | varchar(50) | ❌ | | Tên tiếng Anh |
| `native_name` | varchar(50) | ❌ | | Tên hiển thị ở nút chọn ngôn ngữ (`日本語`) |
| `short_label` | varchar(5) | ❌ | | Nhãn ngắn ở Sidebar (`JA`) |
| `text_direction` | varchar(3) | ❌ | `'ltr'` | `ltr / rtl` |
| `fallback_code` | varchar(10) | ✅ | | FK → `languages.code`. Thiếu bản dịch thì lấy ngôn ngữ này (mặc định `en`) |
| `is_active` | boolean | ❌ | `false` | Chỉ ngôn ngữ `true` xuất hiện ở Sidebar |
| `is_default` | boolean | ❌ | `false` | Partial UNIQUE: 1 dòng `true` (`ja`) |
| `sort_order` | smallint | ❌ | `0` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A4. `time_zones`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(64) | ❌ | | **PK**. `Asia/Tokyo` |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` |
| `utc_offset_minutes` | smallint | ❌ | | Chỉ để hiển thị |
| `country_code` | char(2) | ✅ | | FK → `countries.code` |
| `is_active` | boolean | ❌ | `true` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A5. `exchange_rates`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `base_currency` | char(3) | ❌ | | FK |
| `quote_currency` | char(3) | ❌ | | FK. CHECK khác `base_currency` |
| `rate` | numeric(20,10) | ❌ | | CHECK `> 0` |
| `rate_date` | date | ❌ | | |
| `source` | varchar(30) | ❌ | `'api'` | `api / manual` |
| `fetched_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(base_currency, quote_currency, rate_date, source)`. Chỉ service_role ghi.

### A6. `providers` — Nhà cung cấp / định dạng import (thay hằng số `PROVIDERS`)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(30) | ❌ | | **PK**. `paypay, paypay_card, rakuten_pay, smbc, mufg, vcb, mbbank, generic_csv, manual, ai_scan` |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` (`PayPayカード`) |
| `description_key` | varchar(150) | ✅ | | FK. Thay `descJa / descVi / descEn` |
| `account_type_code` | varchar(20) | ✅ | | FK → `account_types.code`. Loại tài khoản đề xuất |
| `region` | varchar(10) | ❌ | `'global'` | `jp / vn / global` (tab vùng ở màn Import) |
| `country_code` | char(2) | ✅ | | FK |
| `color` | varchar(9) | ❌ | | `#FF0033` |
| `initials` | varchar(4) | ❌ | | `PP` |
| `logo_path` | text | ✅ | | Bucket `public-assets` |
| `parser_code` | varchar(30) | ✅ | | Tên parser trong `features/import/parsers` |
| `supports_csv` | boolean | ❌ | `false` | |
| `supports_pdf` | boolean | ❌ | `false` | |
| `supports_api` | boolean | ❌ | `false` | Có thể kết nối tự động (`bank_connections`) |
| `is_active` | boolean | ❌ | `true` | |
| `sort_order` | smallint | ❌ | `0` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### A7. `account_types` — Loại tài khoản
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(20) | ❌ | | **PK**. `cash, bank, credit_card, e_wallet, investment, loan, other` |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` |
| `icon` | varchar(50) | ❌ | | Tên icon lucide |
| `is_liability` | boolean | ❌ | `false` | Thẻ tín dụng, khoản vay: số dư âm là bình thường |
| `sort_order` | smallint | ❌ | `0` | |

---

## B. Đa ngôn ngữ (thay `lib/i18n.ts` làm nguồn chính và thay `ui_translations`)

### B1. `translation_keys` — Danh sách mọi chuỗi có thể dịch
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `key` | varchar(150) | ❌ | | **PK**. Dạng chấm: `nav.transactions`, `dashboard.totalBalance`, `currency.JPY.name`, `category.default.food` |
| `namespace` | varchar(50) | ❌ | | Phần đầu của key (`nav`, `dashboard`…): lọc trong màn biên tập |
| `description` | text | ✅ | | Chuỗi này hiện ở đâu (cho người dịch) |
| `placeholders` | varchar(200) | ✅ | | Tham số được phép, cách nhau dấu phẩy: `count,total` (giá trị dùng `{{count}}`) |
| `max_length` | smallint | ✅ | | Giới hạn độ dài để không vỡ layout |
| `is_user_editable` | boolean | ❌ | `false` | `true` = người dùng được đổi chữ này trên màn hình (tên menu, tên KPI…) |
| `is_active` | boolean | ❌ | `true` | Key không còn dùng → `false` thay vì xoá |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

Chuỗi dạng mảng trong `lib/i18n.ts` (ví dụ `calendar.days`) tách thành từng key: `calendar.days.0` … `calendar.days.6`.

### B2. `translations` — Bản dịch chuẩn của hệ thống
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `key` | varchar(150) | ❌ | | FK → `translation_keys.key` cascade. PK ghép |
| `language_code` | varchar(10) | ❌ | | FK → `languages.code`. PK ghép |
| `value` | text | ❌ | | Chuỗi hiển thị, có thể chứa `{{placeholder}}` |
| `status` | varchar(20) | ❌ | `'approved'` | `draft / machine / approved` (bản máy dịch cần duyệt) |
| `updated_by` | uuid | ✅ | | FK → `users.id` set null |
| `updated_at` | timestamptz | ❌ | `now()` | |

### B3. `translation_overrides` — Người dùng sửa chữ trên màn hình
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `key` | varchar(150) | ❌ | | FK → `translation_keys.key` cascade. Trigger: key phải `is_user_editable` |
| `language_code` | varchar(10) | ❌ | | FK → `languages.code` |
| `ledger_id` | uuid | ✅ | | FK → `ledgers.id` cascade. Áp cho mọi thành viên của sổ (cần `ledger.update`) |
| `user_id` | uuid | ✅ | | FK → `users.id` cascade. Chỉ áp cho riêng người này |
| `value` | text | ❌ | | Chữ thay thế |
| *AUDIT* | | | | |

CHECK: đúng 1 trong `ledger_id` / `user_id` khác null. UNIQUE `(key, language_code, ledger_id, user_id)` NULLS NOT DISTINCT.

**Thứ tự lấy chữ** (RPC `get_ui_texts(p_language, p_ledger_id)`, cache ở `/api/translations`):
1. `translation_overrides` của người dùng
2. `translation_overrides` của sổ đang chọn
3. `translations` đúng ngôn ngữ, `status <> 'draft'`
4. `translations` của `languages.fallback_code`
5. Chính `key` (để dễ phát hiện chuỗi thiếu)

**Thêm ngôn ngữ mới:** insert `languages` (`is_active=false`) → điền `translations` (tay hoặc máy dịch, `status='machine'`) → view `v_translation_coverage` báo % đã dịch → bật `is_active` là nút ngôn ngữ xuất hiện trên Sidebar. Không sửa code, không sửa schema.

**Nguồn ban đầu:** script `scripts/seed-translations.ts` đọc `lib/i18n.ts` và sinh SQL seed cho `translation_keys` + `translations` (ja/vi/en). Sau đó DB là nguồn chính; `lib/i18n.ts` chỉ còn là bản dự phòng khi offline.

---

## C. Người dùng & quyền

### C1. `users`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | | **PK = `auth.users.id`**, FK cascade |
| `email` | citext | ❌ | | UNIQUE. Đồng bộ từ `auth.users` bằng trigger, client không sửa |
| `display_name` | varchar(100) | ❌ | | |
| `first_name` | varchar(100) | ✅ | | |
| `last_name` | varchar(100) | ✅ | | |
| `avatar_path` | text | ✅ | | Bucket `avatars` |
| `phone` | varchar(30) | ✅ | | |
| `birth_date` | date | ✅ | | |
| `gender` | varchar(20) | ✅ | | `male / female / other / prefer_not_to_say` |
| `country_code` | char(2) | ✅ | | FK |
| `status` | varchar(20) | ❌ | `'active'` | `active / disabled`. Client không sửa |
| `onboarded_at` | timestamptz | ✅ | | Quyết định chuyển hướng `/onboarding` |
| `last_seen_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

Trigger `on_auth_user_created` → tạo `users`, `user_preferences`, `user_notification_settings` mặc định.

### C2. `user_preferences`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `user_id` | uuid | ❌ | | **PK**, FK → `users.id` cascade |
| `language_code` | varchar(10) | ❌ | `'ja'` | FK → `languages.code` |
| `locale` | varchar(10) | ❌ | `'ja-JP'` | |
| `timezone_code` | varchar(64) | ❌ | `'Asia/Tokyo'` | FK |
| `default_currency_code` | char(3) | ❌ | `'JPY'` | FK. Đề xuất khi tạo sổ |
| `default_ledger_id` | uuid | ✅ | | FK → `ledgers.id` set null |
| `date_format` | varchar(20) | ❌ | `'yyyy-MM-dd'` | |
| `week_starts_on` | smallint | ❌ | `0` | 0 = Chủ nhật |
| `theme` | varchar(10) | ❌ | `'system'` | `light / dark / system` (`/settings/appearance`) |
| `dashboard_density` | varchar(15) | ❌ | `'comfortable'` | `comfortable / compact` |
| `hide_balances` | boolean | ❌ | `false` | |
| `start_page` | varchar(50) | ❌ | `'/'` | |
| `updated_at` | timestamptz | ❌ | `now()` | |

### C3. `user_sessions` — Phiên đăng nhập / thiết bị (`/settings/security`, `/settings/devices`)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | | FK → `users.id` cascade |
| `auth_session_id` | uuid | ✅ | | UNIQUE. `auth.sessions.id` — thu hồi phiên thật |
| `device_name` | varchar(100) | ✅ | | `MacBook Pro`, `iPhone` |
| `device_type` | varchar(10) | ❌ | `'desktop'` | `desktop / mobile / tablet` |
| `browser` | varchar(50) | ✅ | | Parse từ User-Agent |
| `os` | varchar(50) | ✅ | | |
| `ip_address` | inet | ✅ | | |
| `city` | varchar(100) | ✅ | | |
| `country_code` | char(2) | ✅ | | FK |
| `risk_level` | varchar(10) | ❌ | `'low'` | `low / medium / high` (IP/thiết bị mới) |
| `is_trusted` | boolean | ❌ | `false` | |
| `created_at` | timestamptz | ❌ | `now()` | |
| `last_active_at` | timestamptz | ❌ | `now()` | |
| `revoked_at` | timestamptz | ✅ | | |

Ghi bởi Edge Function khi đăng nhập / middleware định kỳ. MFA và passkey dùng Supabase Auth (`auth.mfa_factors`), không cần bảng riêng.

### C4. `roles`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(20) | ❌ | | **PK**. `OWNER, ADMIN, MEMBER, VIEWER, ACCOUNTANT, AUDITOR` |
| `name_key` | varchar(150) | ❌ | | FK → `translation_keys.key` |
| `description_key` | varchar(150) | ✅ | | FK. Mô tả trong modal mời |
| `rank` | smallint | ❌ | | 400/300/200/100 |
| `is_assignable` | boolean | ❌ | `true` | OWNER = `false` |
| `sort_order` | smallint | ❌ | `0` | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

### C5. `permissions`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(50) | ❌ | | **PK**. `transaction.create` |
| `resource` | varchar(30) | ❌ | | |
| `action` | varchar(20) | ❌ | | |
| `description_key` | varchar(150) | ✅ | | FK |

### C6. `role_permissions`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `role_code` | varchar(20) | ❌ | | FK. PK ghép |
| `permission_code` | varchar(50) | ❌ | | FK. PK ghép |

| Quyền | OWNER | ADMIN | MEMBER | ACCOUNTANT | AUDITOR | VIEWER |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `ledger.read`, `report.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ledger.update`, `translation.override` | ✅ | ✅ | | | | |
| `ledger.delete` | ✅ | | | | | |
| `member.invite / update / remove` | ✅ | ✅ | | | | |
| `account.* / category.* / budget.* / recurring.*` | ✅ | ✅ | ✅ | ✅ | | |
| `transaction.create / update`, `import.create` | ✅ | ✅ | ✅ | ✅ | | |
| `transaction.delete`, `transaction.reconcile` | ✅ | ✅ | | ✅ | | |
| `report.export`, `audit.read` | ✅ | ✅ | | ✅ | ✅ | |

---

## D. Sổ & thành viên

### D1. `ledger_types`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(20) | ❌ | | **PK**. `personal, family, business, freelance` |
| `name_key` | varchar(150) | ❌ | | FK |
| `description_key` | varchar(150) | ✅ | | FK. Mô tả thẻ ở onboarding |
| `icon` | varchar(50) | ❌ | | |
| `default_fiscal_start_month` | smallint | ❌ | `1` | business = 4 |
| `default_template_code` | varchar(30) | ✅ | | FK → `category_templates.code` |
| `sort_order` | smallint | ❌ | `0` | |
| `is_active` | boolean | ❌ | `true` | |

### D2. `ledgers`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `name` | varchar(100) | ❌ | | |
| `ledger_type_code` | varchar(20) | ❌ | `'personal'` | FK → `ledger_types.code` |
| `currency_code` | char(3) | ❌ | | FK. Nguồn duy nhất cho hiển thị tiền |
| `timezone_code` | varchar(64) | ❌ | | FK |
| `country_code` | char(2) | ✅ | | FK |
| `locale` | varchar(10) | ❌ | | |
| `fiscal_year_start_month` | smallint | ❌ | `1` | 1–12 |
| `icon` | varchar(50) | ✅ | | |
| `color` | varchar(9) | ✅ | | |
| `owner_user_id` | uuid | ❌ | | FK → `users.id`. Chỉ đổi qua RPC chuyển quyền sở hữu |
| `status` | varchar(20) | ❌ | `'active'` | `active / archived` |
| *AUDIT* | | | | |

### D3. `ledger_members`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `user_id` | uuid | ❌ | | FK cascade |
| `role_code` | varchar(20) | ❌ | `'MEMBER'` | FK → `roles.code` |
| `status` | varchar(20) | ❌ | `'active'` | `active / left / removed` |
| `color` | varchar(9) | ✅ | | Màu avatar trong sổ |
| `joined_at` | timestamptz | ❌ | `now()` | |
| `left_at` | timestamptz | ✅ | | |
| `invitation_id` | uuid | ✅ | | FK → `ledger_invitations.id` set null |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, user_id)`; mời lại → kích hoạt dòng cũ. Mỗi sổ đúng 1 OWNER active.

### D4. `ledger_invitations`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `email` | citext | ❌ | | Kể cả email chưa đăng ký |
| `role_code` | varchar(20) | ❌ | `'MEMBER'` | FK. CHECK `<> 'OWNER'` |
| `token_hash` | char(64) | ❌ | | UNIQUE. SHA-256; không đọc được qua RLS |
| `status` | varchar(20) | ❌ | `'pending'` | `pending / accepted / declined / revoked / expired` |
| `message` | text | ✅ | | |
| `expires_at` | timestamptz | ❌ | `now() + 7 days` | |
| `invited_by` | uuid | ✅ | | FK set null |
| `accepted_by` | uuid | ✅ | | FK set null |
| `responded_at` | timestamptz | ✅ | | |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

Partial UNIQUE `(ledger_id, email) where status = 'pending'`.

---

## E. Tiền

### E1. `financial_accounts`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `name` | varchar(100) | ❌ | | |
| `account_type_code` | varchar(20) | ❌ | | FK → `account_types.code` |
| `provider_code` | varchar(30) | ✅ | | FK → `providers.code`. Chọn parser khi import |
| `institution_name` | varchar(100) | ✅ | | |
| `account_number_last4` | varchar(4) | ✅ | | |
| `currency_code` | char(3) | ❌ | | FK |
| `opening_balance` | numeric(20,4) | ❌ | `0` | |
| `opening_date` | date | ❌ | `current_date` | |
| `credit_limit` | numeric(20,4) | ✅ | | |
| `color` | varchar(9) | ✅ | | |
| `icon` | varchar(50) | ✅ | | |
| `include_in_net_worth` | boolean | ❌ | `true` | |
| `is_archived` | boolean | ❌ | `false` | |
| `sort_order` | smallint | ❌ | `0` | |
| *AUDIT* | | | | |

### E1b. `category_kinds` — Loại nhóm hiển thị trên thẻ danh mục (theo thiết kế: "Trung tâm chi phí"…)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(30) | ❌ | | PK: `cost_center`, `department`, `project`, `team`, `subsidiary` |
| `name_key` | varchar(150) | ❌ | | FK `translation_keys` |
| `sort_order` | smallint | ❌ | 0 | |
| `is_active` | boolean | ❌ | true | |

`categories.kind_code` (FK, mặc định `cost_center`). Tab "Định kỳ" của màn danh mục = danh mục có `recurring_rules` đang bật (không cần cột riêng). `v_daily_summary` có thêm `expense_count`, `income_count` cho thẻ "件数 · 平均" của màn 明細一覧.

### E2. `categories`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `parent_id` | uuid | ✅ | | FK self. Cùng sổ, tối đa 3 cấp, không vòng |
| `slug` | varchar(80) | ❌ | | UNIQUE `(ledger_id, slug)` → URL `/categories/[slug]` |
| `name` | varchar(100) | ❌ | | Tên người dùng đặt / đã sửa |
| `name_key` | varchar(150) | ✅ | | FK → `translation_keys.key`. Có ở danh mục mặc định; hiển thị theo ngôn ngữ cho tới khi người dùng đổi tên |
| `description` | text | ✅ | | |
| `category_type` | varchar(20) | ❌ | `'expense'` | `expense / income / transfer` |
| `icon` | varchar(50) | ✅ | | Tên icon lucide |
| `color` | varchar(9) | ✅ | | |
| `sort_order` | smallint | ❌ | `0` | |
| `is_system` | boolean | ❌ | `false` | `未分類`, `振替` — không xoá được |
| `is_shared` | boolean | ❌ | `false` | Chia tiền giữa thành viên |
| `is_archived` | boolean | ❌ | `false` | |
| `archived_at` | timestamptz | ✅ | | Dải "Lưu trữ" |
| `template_item_id` | uuid | ✅ | | FK → `category_template_items.id` set null. Sinh từ mẫu nào |
| *AUDIT* | | | | |

Tên hiển thị: `category_translations[ngôn ngữ]` → (nếu `name_key` còn) bản dịch của key → `name`.

### E3. `category_translations` — Người dùng tự dịch tên danh mục
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `category_id` | uuid | ❌ | | FK cascade. PK ghép |
| `language_code` | varchar(10) | ❌ | | FK. PK ghép |
| `name` | varchar(100) | ❌ | | |
| `description` | text | ✅ | | |
| `updated_at` | timestamptz | ❌ | `now()` | |

### E4. `category_members` — Thành viên của danh mục chia sẻ (tab "メンバー")
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `category_id` | uuid | ❌ | | FK cascade |
| `user_id` | uuid | ❌ | | FK cascade. Phải là thành viên active của sổ |
| `role` | varchar(10) | ❌ | `'member'` | `owner / member` ("chủ nhóm") |
| `share_ratio` | numeric(7,4) | ✅ | | Tỷ lệ chia mặc định; `NULL` = chia đều |
| `joined_at` | timestamptz | ❌ | `now()` | |
| `left_at` | timestamptz | ✅ | | |

UNIQUE `(category_id, user_id)`.

### E5. `category_accounts` — Tài khoản liên kết với danh mục ("Liên kết tài khoản")
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `category_id` | uuid | ❌ | | FK cascade. PK ghép |
| `account_id` | uuid | ❌ | | FK → `financial_accounts.id` cascade. PK ghép |
| `is_default` | boolean | ❌ | `false` | Tài khoản chọn sẵn khi thêm giao dịch vào danh mục này |
| `created_at` | timestamptz | ❌ | `now()` | |

### E6. `category_rules`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `category_id` | uuid | ❌ | | FK cascade |
| `match_field` | varchar(20) | ❌ | `'description'` | `description / merchant` |
| `match_type` | varchar(20) | ❌ | `'contains'` | `contains / equals / starts_with / regex` |
| `pattern` | varchar(200) | ❌ | | Đã chuẩn hoá hoa/thường, full/half-width |
| `account_id` | uuid | ✅ | | FK. Chỉ áp cho 1 tài khoản |
| `transaction_type` | varchar(20) | ✅ | | |
| `amount_min` | numeric(20,4) | ✅ | | |
| `amount_max` | numeric(20,4) | ✅ | | |
| `priority` | smallint | ❌ | `100` | |
| `apply_on_import` | boolean | ❌ | `true` | "áp dụng tự động khi import" |
| `is_active` | boolean | ❌ | `true` | |
| `hit_count` | integer | ❌ | `0` | |
| `last_matched_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, match_field, match_type, pattern)`.

### E7. `category_templates` — Bộ danh mục mẫu (Du lịch, Hộ gia đình, Đám cưới…)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(30) | ❌ | | **PK**. `default_personal, household, travel, wedding, business` |
| `name_key` | varchar(150) | ❌ | | FK |
| `description_key` | varchar(150) | ✅ | | FK |
| `icon` | varchar(50) | ✅ | | |
| `sort_order` | smallint | ❌ | `0` | |
| `is_active` | boolean | ❌ | `true` | |

### E8. `category_template_items`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `template_code` | varchar(30) | ❌ | | FK cascade |
| `parent_item_id` | uuid | ✅ | | FK self |
| `slug` | varchar(80) | ❌ | | |
| `name_key` | varchar(150) | ❌ | | FK |
| `category_type` | varchar(20) | ❌ | `'expense'` | |
| `icon` | varchar(50) | ✅ | | |
| `color` | varchar(9) | ✅ | | |
| `is_system` | boolean | ❌ | `false` | |
| `sort_order` | smallint | ❌ | `0` | |

UNIQUE `(template_code, slug)`. RPC `apply_category_template(ledger_id, template_code)` sao chép vào `categories`.

### E9. `budgets`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `category_id` | uuid | ✅ | | FK cascade. `NULL` = ngân sách tổng |
| `period_type` | varchar(10) | ❌ | `'monthly'` | `monthly / yearly` |
| `period_start` | date | ✅ | | `NULL` = mọi kỳ |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `warning_threshold_pct` | smallint | ❌ | `80` | |
| `rollover` | boolean | ❌ | `false` | |
| *AUDIT* | | | | |

UNIQUE `(ledger_id, category_id, period_type, period_start)` NULLS NOT DISTINCT.

### E10. `tags`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `name` | varchar(50) | ❌ | | UNIQUE `(ledger_id, lower(name))` |
| `color` | varchar(9) | ✅ | | |
| *AUDIT* | | | | |

### E11. `transactions`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `account_id` | uuid | ❌ | | FK → `financial_accounts.id` |
| `transfer_account_id` | uuid | ✅ | | FK. Bắt buộc khi `transfer` |
| `transaction_type` | varchar(20) | ❌ | | `expense / income / transfer` |
| `status` | varchar(20) | ❌ | `'posted'` | `pending / posted / void` |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `currency_code` | char(3) | ❌ | | FK |
| `exchange_rate` | numeric(20,10) | ❌ | `1` | |
| `base_amount` | numeric(20,4) | ❌ | | Trigger tính = `amount × exchange_rate` |
| `transaction_date` | date | ❌ | | |
| `transaction_time` | time | ✅ | | |
| `description` | text | ❌ | | |
| `merchant_name` | varchar(200) | ✅ | | |
| `category_id` | uuid | ✅ | | FK set null |
| `categorized_by` | varchar(10) | ✅ | | `manual / rule / ai / import` |
| `category_rule_id` | uuid | ✅ | | FK set null |
| `needs_review` | boolean | ❌ | `false` | |
| `notes` | text | ✅ | | |
| `paid_by_user_id` | uuid | ✅ | | FK set null. Cột "ユーザー" |
| `source` | varchar(20) | ❌ | `'manual'` | `manual / import / scan / recurring / bank_sync` |
| `import_job_id` | uuid | ✅ | | FK set null |
| `import_row_id` | uuid | ✅ | | FK → `import_rows.id` set null. Xem "元データ" |
| `document_id` | uuid | ✅ | | FK set null |
| `recurring_rule_id` | uuid | ✅ | | FK set null |
| `recurring_occurrence` | date | ✅ | | |
| `bank_connection_id` | uuid | ✅ | | FK set null (giai đoạn 3) |
| `external_id` | varchar(255) | ✅ | | |
| `dedupe_hash` | char(64) | ✅ | | |
| `exclude_from_reports` | boolean | ❌ | `false` | |
| `is_reconciled` | boolean | ❌ | `false` | KPI "Chờ đối soát" / "要確認" |
| `reconciled_at` | timestamptz | ✅ | | |
| `reconciled_by` | uuid | ✅ | | FK set null |
| *AUDIT* | | | | |

Ràng buộc: CHECK transfer ⇔ `transfer_account_id`; partial UNIQUE `(account_id, external_id)`, `(account_id, dedupe_hash)`, `(recurring_rule_id, recurring_occurrence)`. Index `(ledger_id, transaction_date desc)`, `(ledger_id, category_id, transaction_date)`, `(account_id, transaction_date)`, trigram `description`.

### E12. `transaction_tags`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `transaction_id` | uuid | ❌ | | FK cascade. PK ghép |
| `tag_id` | uuid | ❌ | | FK cascade. PK ghép |
| `created_at` | timestamptz | ❌ | `now()` | |

### E13. `transaction_shares`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `transaction_id` | uuid | ❌ | | FK cascade |
| `user_id` | uuid | ❌ | | FK cascade |
| `share_amount` | numeric(20,4) | ❌ | | Tổng = `transactions.amount` (trigger) |
| `created_at`, `updated_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(transaction_id, user_id)`.

### E14. `settlements` — Thanh toán lại giữa thành viên
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `category_id` | uuid | ✅ | | FK set null. Trong danh mục chia sẻ nào |
| `from_user_id` | uuid | ❌ | | FK. Người trả lại |
| `to_user_id` | uuid | ❌ | | FK. Người nhận. CHECK khác `from_user_id` |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `currency_code` | char(3) | ❌ | | FK |
| `settled_on` | date | ❌ | `current_date` | |
| `note` | text | ✅ | | |
| `transaction_id` | uuid | ✅ | | FK set null. Giao dịch chuyển tiền tương ứng (nếu có) |
| *AUDIT* | | | | |

View `v_member_balances` = Σ đã trả − Σ phần phải chịu ± settlements.

### E15. `recurring_rules`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `name` | varchar(100) | ❌ | | |
| `transaction_type` | varchar(20) | ❌ | `'expense'` | |
| `amount` | numeric(20,4) | ❌ | | CHECK `> 0` |
| `currency_code` | char(3) | ❌ | | FK |
| `account_id` | uuid | ❌ | | FK |
| `transfer_account_id` | uuid | ✅ | | FK |
| `category_id` | uuid | ✅ | | FK set null |
| `description` | text | ❌ | | |
| `notes` | text | ✅ | | |
| `frequency` | varchar(10) | ❌ | `'monthly'` | `daily / weekly / monthly / yearly` |
| `interval_count` | smallint | ❌ | `1` | |
| `day_of_month` | smallint | ✅ | | |
| `day_of_week` | smallint | ✅ | | |
| `month_of_year` | smallint | ✅ | | |
| `start_date` | date | ❌ | | |
| `end_date` | date | ✅ | | |
| `next_run_date` | date | ❌ | | |
| `last_generated_date` | date | ✅ | | |
| `auto_post` | boolean | ❌ | `true` | |
| `is_active` | boolean | ❌ | `true` | |
| *AUDIT* | | | | |

### E16. `bank_connections` — Kết nối ngân hàng / ứng dụng (giai đoạn 3)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `provider_code` | varchar(30) | ❌ | | FK → `providers.code` (`supports_api = true`) |
| `account_id` | uuid | ✅ | | FK → `financial_accounts.id` set null |
| `external_connection_id` | varchar(255) | ✅ | | ID phía nhà cung cấp |
| `vault_secret_id` | uuid | ✅ | | Token lưu trong Supabase Vault — **không bao giờ lưu mật khẩu/token trong bảng** |
| `status` | varchar(20) | ❌ | `'pending'` | `pending / active / error / expired / revoked` |
| `consent_expires_at` | timestamptz | ✅ | | |
| `last_synced_at` | timestamptz | ✅ | | |
| `last_error` | text | ✅ | | |
| *AUDIT* | | | | |

---

## F. Nhập liệu

### F1. `import_jobs`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `account_id` | uuid | ❌ | | FK |
| `provider_code` | varchar(30) | ❌ | | FK → `providers.code` |
| `file_name` | varchar(255) | ❌ | | |
| `file_type` | varchar(10) | ❌ | | `csv / pdf` |
| `file_path` | text | ✅ | | Bucket `imports` |
| `file_size` | integer | ✅ | | |
| `checksum` | char(64) | ❌ | | Cảnh báo file đã import |
| `status` | varchar(20) | ❌ | `'parsed'` | `parsed / importing / completed / failed / cancelled` |
| `total_rows` | integer | ❌ | `0` | |
| `imported_rows` | integer | ❌ | `0` | |
| `duplicate_rows` | integer | ❌ | `0` | |
| `skipped_rows` | integer | ❌ | `0` | |
| `error_rows` | integer | ❌ | `0` | |
| `error_message` | text | ✅ | | |
| `completed_at` | timestamptz | ✅ | | |
| *AUDIT* | | | | |

### F2. `import_column_mappings` — Mapping cột CSV chung
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `import_job_id` | uuid | ✅ | | FK cascade. Mapping của 1 lần import |
| `account_id` | uuid | ✅ | | FK cascade. Preset lưu cho tài khoản (lần sau tự áp) |
| `target_field` | varchar(20) | ❌ | | `date / time / description / amount / debit / credit / currency / reference` |
| `source_column` | varchar(100) | ❌ | | Tên cột trong file |
| `source_index` | smallint | ✅ | | Vị trí cột |
| `date_format` | varchar(20) | ✅ | | `yyyy/MM/dd` |
| `created_at` | timestamptz | ❌ | `now()` | |

CHECK: đúng 1 trong `import_job_id` / `account_id`. UNIQUE `(import_job_id, target_field)`, `(account_id, target_field)`.

### F3. `import_rows`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `import_job_id` | uuid | ❌ | | FK cascade |
| `row_number` | integer | ❌ | | |
| `raw_line` | text | ✅ | | Dòng gốc nguyên văn (CSV) |
| `parsed_date` | date | ✅ | | |
| `parsed_amount` | numeric(20,4) | ✅ | | Luôn dương |
| `parsed_type` | varchar(20) | ✅ | | |
| `parsed_description` | text | ✅ | | |
| `suggested_category_id` | uuid | ✅ | | FK set null |
| `status` | varchar(20) | ❌ | `'new'` | `new / duplicate / error / skipped / imported` |
| `duplicate_of_id` | uuid | ✅ | | FK → `transactions.id` set null |
| `error_message` | text | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |

UNIQUE `(import_job_id, row_number)`.

### F4. `import_row_values` — Từng ô của dòng gốc (hiện ở "元データ")
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `import_row_id` | uuid | ❌ | | FK cascade. PK ghép |
| `column_index` | smallint | ❌ | | PK ghép |
| `column_name` | varchar(100) | ❌ | | Tiêu đề cột trong file (`利用日`, `金額`) |
| `value` | text | ✅ | | |

### F5. `documents` — Hoá đơn
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `document_type` | varchar(20) | ❌ | `'receipt'` | `receipt / invoice / statement / other` |
| `storage_path` | text | ❌ | | Bucket `receipts` |
| `file_name` | varchar(255) | ❌ | | |
| `mime_type` | varchar(50) | ❌ | | |
| `file_size` | integer | ❌ | | ≤ 10MB |
| `ocr_status` | varchar(20) | ❌ | `'pending'` | `pending / processing / done / failed` |
| `ocr_provider` | varchar(30) | ✅ | | `gemini` |
| `ocr_model` | varchar(50) | ✅ | | |
| `ocr_raw_text` | text | ✅ | | Toàn bộ chữ đọc được |
| `extracted_merchant` | varchar(200) | ✅ | | |
| `extracted_date` | date | ✅ | | |
| `extracted_total` | numeric(20,4) | ✅ | | |
| `extracted_tax` | numeric(20,4) | ✅ | | |
| `extracted_currency` | char(3) | ✅ | | FK |
| `suggested_category_id` | uuid | ✅ | | FK set null |
| `confidence` | numeric(4,3) | ✅ | | |
| `error_message` | text | ✅ | | |
| `transaction_id` | uuid | ✅ | | FK set null |
| *AUDIT* | | | | |

### F6. `document_line_items` — Dòng hàng trên hoá đơn
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `document_id` | uuid | ❌ | | FK cascade |
| `line_number` | smallint | ❌ | | UNIQUE `(document_id, line_number)` |
| `name` | varchar(200) | ❌ | | |
| `quantity` | numeric(10,3) | ❌ | `1` | |
| `unit_price` | numeric(20,4) | ✅ | | |
| `amount` | numeric(20,4) | ❌ | | |
| `tax_rate` | numeric(5,2) | ✅ | | 8 / 10 (%) |
| `category_id` | uuid | ✅ | | FK set null |

---

## G. Thông báo & nhật ký

### G1. `notification_categories` — Nhóm thông báo (hàng của ma trận cài đặt)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(30) | ❌ | | **PK**. `security, billing, transactions, budget, import, report, insight, recurring, members, product_updates` |
| `name_key` | varchar(150) | ❌ | | FK |
| `description_key` | varchar(150) | ✅ | | FK |
| `is_mandatory` | boolean | ❌ | `false` | `security` không tắt được kênh in-app |
| `sort_order` | smallint | ❌ | `0` | |

### G2. `notification_channels` — Kênh (cột của ma trận)
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(20) | ❌ | | **PK**. `in_app, email, push, sms` (sau này `line`) |
| `name_key` | varchar(150) | ❌ | | FK |
| `icon` | varchar(50) | ❌ | | |
| `is_available` | boolean | ❌ | `true` | `sms` / `push` = `false` cho tới khi có hạ tầng (UI hiện mờ) |
| `sort_order` | smallint | ❌ | `0` | |

### G3. `notification_types`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `code` | varchar(40) | ❌ | | **PK**. `budget_warning, budget_exceeded, import_done, report_ready, unusual_expense, recurring_due, recurring_pending, invitation_received, member_joined, new_login` |
| `category_code` | varchar(30) | ❌ | | FK → `notification_categories.code` |
| `title_key` | varchar(150) | ❌ | | FK. Có thể chứa `{{placeholder}}` |
| `body_key` | varchar(150) | ❌ | | FK |
| `icon` | varchar(50) | ❌ | | |
| `severity` | varchar(10) | ❌ | `'info'` | `info / success / warning / danger` → màu icon |
| `default_action_path` | varchar(200) | ✅ | | `/categories/{{category_slug}}` |
| `is_active` | boolean | ❌ | `true` | |

### G4. `user_notification_settings`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `user_id` | uuid | ❌ | | FK cascade. PK ghép |
| `category_code` | varchar(30) | ❌ | | FK. PK ghép |
| `channel_code` | varchar(20) | ❌ | | FK. PK ghép |
| `is_enabled` | boolean | ❌ | | |
| `updated_at` | timestamptz | ❌ | `now()` | |

Thêm kênh / nhóm mới → thêm dòng lookup; người dùng chưa có dòng thì dùng bảng `notification_defaults` (PK `category_code, channel_code`, cột `is_enabled`). View `v_notification_settings` gộp mặc định + lựa chọn của người dùng cho màn hình cài đặt.

### G5. `notifications`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | | FK cascade |
| `ledger_id` | uuid | ✅ | | FK cascade |
| `type_code` | varchar(40) | ❌ | | FK → `notification_types.code` |
| `action_url` | text | ✅ | | Đã thay tham số |
| `entity_type` | varchar(30) | ✅ | | |
| `entity_id` | uuid | ✅ | | |
| `read_at` | timestamptz | ✅ | | |
| `archived_at` | timestamptz | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |
| `expires_at` | timestamptz | ✅ | | |

### G6. `notification_params` — Tham số của thông báo
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `notification_id` | uuid | ❌ | | FK cascade. PK ghép |
| `name` | varchar(50) | ❌ | | PK ghép. `category`, `pct`, `count` |
| `value` | text | ❌ | | UI thay vào `{{name}}` của chuỗi đã dịch |

### G7. `audit_logs`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | bigint | ❌ | identity | PK |
| `ledger_id` | uuid | ✅ | | FK set null |
| `actor_user_id` | uuid | ✅ | | FK set null |
| `action` | varchar(30) | ❌ | | `create / update / delete / import / invite / join / leave / role_change / login / export / translation_override` |
| `entity_type` | varchar(30) | ❌ | | |
| `entity_id` | uuid | ✅ | | |
| `entity_label` | varchar(200) | ✅ | | Tên hiển thị lúc ghi (vẫn đọc được khi đối tượng đã xoá) |
| `ip_address` | inet | ✅ | | |
| `user_agent` | text | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |

### G8. `audit_log_changes`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `audit_log_id` | bigint | ❌ | | FK cascade. PK ghép |
| `field_name` | varchar(50) | ❌ | | PK ghép |
| `old_value` | text | ✅ | | |
| `new_value` | text | ✅ | | |

Chỉ INSERT qua trigger/RPC.

---

## H. Quyền riêng tư & nhà phát triển (giai đoạn 3)

### H1. `data_requests` — `/settings/privacy`
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | | FK cascade |
| `ledger_id` | uuid | ✅ | | FK cascade. Xuất 1 sổ hay toàn bộ |
| `request_type` | varchar(10) | ❌ | | `export / delete` |
| `file_format` | varchar(10) | ✅ | | `csv / xlsx` |
| `status` | varchar(20) | ❌ | `'pending'` | `pending / processing / ready / completed / failed / cancelled` |
| `file_path` | text | ✅ | | Bucket `exports` |
| `expires_at` | timestamptz | ✅ | | Link tải hết hạn |
| `error_message` | text | ✅ | | |
| `requested_at` | timestamptz | ❌ | `now()` | |
| `completed_at` | timestamptz | ✅ | | |

### H2. `api_tokens` — Menu "開発者ツール"
| Cột | Kiểu | Null | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | uuid | ❌ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ❌ | | FK cascade |
| `ledger_id` | uuid | ❌ | | FK cascade |
| `name` | varchar(100) | ❌ | | |
| `token_prefix` | varchar(8) | ❌ | | Hiện để nhận biết (`lw_ab12`) |
| `token_hash` | char(64) | ❌ | | UNIQUE. Token gốc chỉ hiện 1 lần |
| `access_level` | varchar(10) | ❌ | `'read'` | `read / write` |
| `last_used_at` | timestamptz | ✅ | | |
| `expires_at` | timestamptz | ✅ | | |
| `revoked_at` | timestamptz | ✅ | | |
| `created_at` | timestamptz | ❌ | `now()` | |

---

## I. View, RPC, Storage, RLS

### I1. View (`security_invoker = true`)
| View | Dùng ở |
|---|---|
| `v_account_balances` | Dashboard, `/accounts` |
| `v_monthly_summary`, `v_daily_summary` | Dashboard, Lịch, Phân tích, Báo cáo |
| `v_category_monthly` (chi, thu, số GD, ngân sách, % dùng) | Danh mục, Phân tích, Báo cáo |
| `v_classification_stats` | KPI trang Danh mục |
| `v_member_balances` | Tab "残高" danh mục chia sẻ |
| `v_ui_texts` (key, language, value đã áp fallback) | `/api/translations` |
| `v_translation_coverage` (language, total, translated, pct) | Màn quản lý ngôn ngữ |

### I2. RPC chính
`setup_onboarding`, `create_ledger`, `delete_ledger` (chỉ owner, phải gõ lại tên sổ), `apply_category_template`, `invite_member`, `get_invitation`, `accept_invitation`, `decline_invitation`, `revoke_invitation`, `update_member_role`, `remove_member`, `leave_ledger`, `transfer_ledger_ownership`, `merge_categories`, `apply_category_rules`, `check_import_duplicates`, `import_transactions`, `bulk_update_transactions`, `bulk_delete_transactions`, `run_due_recurring`, `get_ui_texts`, `translate`, `set_translation_override`, `reset_translation_override`, `record_session`, `revoke_session`, `delete_my_account`, `create_api_token`. Thanh toán lại (settle) ghi thẳng vào `settlements` (RLS), yêu cầu xuất dữ liệu ghi thẳng vào `data_requests`.

### I3. Storage
`avatars` (công khai đọc), `receipts`, `imports`, `exports` (riêng tư), `public-assets` (logo nhà cung cấp).

### I4. RLS tóm tắt
| Bảng | SELECT | Ghi |
|---|---|---|
| Nhóm A, `roles`, `permissions`, `role_permissions`, `ledger_types`, `category_templates*`, `notification_categories/channels/types` | `authenticated` | service_role |
| `translation_keys`, `translations` | `authenticated` (+ `anon` cho màn đăng nhập) | service_role / người có vai trò dịch (sau) |
| `translation_overrides` | của mình + của sổ mình | của mình; của sổ cần `translation.override` |
| `users` | mình + người cùng sổ | mình, chỉ cột cho phép |
| `user_preferences`, `user_notification_settings`, `user_sessions`, `data_requests`, `api_tokens` | của mình | của mình / RPC |
| `ledgers`, `ledger_members`, `ledger_invitations` | thành viên | RPC |
| Nhóm E, F | thành viên active của `ledger_id` | theo quyền ở C6 |
| `notifications`, `notification_params` | `user_id = auth.uid()` | UPDATE `read_at / archived_at` |
| `audit_logs`, `audit_log_changes` | mình + quyền `audit.read` của sổ | trigger |

## J. Bảng đã bỏ
| Bảng | Lý do |
|---|---|
| `tenants`, `households`, `organizations`, `members` | → `ledgers`, `ledger_members`, `ledger_invitations` |
| `fiscal_calendars`, `fiscal_periods` | → `ledgers.fiscal_year_start_month` |
| `feature_flags`, `system_settings` | Không màn hình nào dùng |
| `ui_translations` | → `translation_keys` + `translations` + `translation_overrides` |
| `category_balances`, `category_budgets`, `recurring_transactions`, `device_verifications` | → view, `budgets`, `recurring_rules`, `user_sessions` |
| Domain 03, 05, 06, phần lớn 07, 08, 11, 12, 13 | Chưa có màn hình |

## K. Thứ tự file migration

Bộ migration nằm ở `supabase/migrations/` (bộ cũ đã được xoá khỏi repo). Dựng lại DB: `supabase db reset` (cục bộ) hoặc `supabase db push` (project trên cloud, sau khi xoá DB cũ).

```
20260928000001_extensions_and_helpers.sql   citext, pgcrypto, pg_trgm; is_client_request, sha256_hex, tg_touch_audit
20260928000002_i18n.sql                     languages, translation_keys, translations
20260928000003_master_data.sql              currencies, countries, time_zones, exchange_rates, account_types, providers
20260928000004_users.sql                    users, user_preferences, user_sessions + trigger đăng ký (auth.users → users)
20260928000005_rbac.sql                     roles, permissions, role_permissions
20260928000006_ledgers.sql                  ledger_types, category_templates(+items), ledgers, ledger_members, ledger_invitations,
                                            translation_overrides, is_ledger_member / has_ledger_permission / shares_ledger_with
20260928000007_money.sql                    financial_accounts, categories(+translations/members/accounts), category_rules, budgets, tags
20260928000008_transactions.sql             transactions, transaction_tags, transaction_shares, settlements, recurring_rules, bank_connections
20260928000009_import_documents.sql         import_jobs, import_column_mappings, import_rows, import_row_values, documents, document_line_items
20260928000010_notifications_audit_privacy.sql  notification_*, notifications, notification_params, audit_logs(+changes), data_requests, api_tokens
20260928000011_views.sql                    8 view (security_invoker)
20260928000012_rpc_core.sql                 onboarding, sổ, lời mời, thành viên, phiên, i18n
20260928000013_rpc_money.sql                danh mục, quy tắc, import, bulk, định kỳ, cảnh báo ngân sách
20260928000014_rls.sql                      RLS + grant theo cột (token_hash không lộ; api_tokens chỉ sửa name/revoked_at)
20260928000015_storage_cron.sql             bucket avatars / receipts / imports / exports + pg_cron (bỏ qua nếu không có)
20260928000016_seed_translations.sql        sinh từ lib/i18n.ts: node scripts/generate-translation-seed.mjs
20260928000017_seed_master.sql              ngôn ngữ, tiền tệ, quốc gia, múi giờ, loại tài khoản, nhà cung cấp, loại sổ, vai trò, quyền, thông báo, mẫu danh mục
20260928000018_account_opening_date.sql     opening_date của tài khoản (khi chưa có số dư đầu kỳ) lùi theo giao dịch sớm nhất
20260928000019_category_period_stats.sql    category_period_stats / classification_period_stats: số liệu trang Danh mục theo kỳ bất kỳ (ngày/tháng/quý/năm)
20260928000020_preview_category_rules.sql   preview_category_rules: màn Nhập gợi ý danh mục bằng đúng quy tắc của sổ (không ghi gì)
20260928000021_provider_rakuten_card.sql     nhà cung cấp 楽天カード (CSV/PDF); Rakuten Pay chỉ còn CSV
20260928000022_save_receipt.sql              save_receipt: hoá đơn quét → tách thành giao dịch theo danh mục của từng món (document_line_items.transaction_id)
```

Sau khi đổi schema: `DATABASE_URL=... npm run db:types` để sinh lại `types/supabase.ts`; sau khi sửa `lib/i18n.ts`: `npm run db:i18n-seed`.

Lưu ý PostgREST: mỗi request trả tối đa `max_rows` (1000, cả trên cloud). Truy vấn có thể vượt mức này phải đọc theo trang (`.range()`), như `get_ui_texts` và `fetchRange`.
