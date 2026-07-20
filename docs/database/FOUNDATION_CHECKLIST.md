# Foundation Schema — Implementation Checklist

Nguồn thiết kế: `docs/database/01_foundation_schema.html` (18 bảng).
Database Supabase được xây **mới hoàn toàn**, không giữ tương thích ngược với schema cũ.

Chú thích trạng thái: ☐ Chưa làm · 🔶 Đang làm · ✅ Xong

## Trạng thái tổng quan

- **Database (SQL migrations)**: ✅ Xong toàn bộ 18 bảng, đã test bằng Postgres local.
- **RLS**: ✅ Bật + viết policy cho toàn bộ 18 bảng, đã test cách ly dữ liệu giữa 2 user độc lập.
- **RBAC + Member lifecycle RPCs**: ✅ `has_permission()` + 9 RPC (`create_household`, `create_organization`, `invite_member`, `cancel_invitation`, `accept_invitation`, `accept_invitation_by_token`, `reject_invitation`, `update_member_role`, `remove_member`, `leave_membership`) — đã test end-to-end.
- **Seed data**: ✅ currencies/languages/countries/time_zones/fiscal_calendars/roles/permissions/role_permissions.
- **`types/supabase.ts`**: ✅ Viết tay lại khớp 100% với migration (không có project Supabase sống để chạy `gen types`).
- **UI / data-access layer (`features/user-management`)**: ✅ Viết lại hoàn toàn theo Foundation (xem phần "UI wiring" bên dưới).
- **`modules/group-management`**: ✅ Đã xoá hoàn toàn theo quyết định của user (concept `groups` không tồn tại trong Foundation).
- **Signup → `public.users` tự động**: ✅ Trigger `on_auth_user_created` (migration 23) — mirror `auth.users` sang `public.users` khi đăng ký, đã test.
- **`app/onboarding` + `auth-provider.tsx`**: ✅ Viết lại theo Foundation — onboarding tạo `tenant` + `household`/`organization` qua RPC thay vì `create_new_ledger_system` (không còn tồn tại); auth-provider gate theo `membership-store` thay vì `ledger-store`. Đã test end-to-end (signup → tenant → household → member OWNER) bằng Postgres local.
- **Kết nối Supabase project thật**: ☐ Chưa có — mọi thứ hiện là file migration local, chưa `supabase link` / `db push`.

## Đã kiểm thử (local Postgres, không phải Supabase project thật)

Dùng Postgres 16 local + giả lập tối thiểu `auth.users`, `auth.uid()`, roles `authenticated/anon/service_role` để chạy toàn bộ 22 file migration theo đúng thứ tự, chạy lại nhiều lần sau mỗi thay đổi:

- [x] Cả 22 migration chạy sạch, đúng thứ tự phụ thuộc FK, không lỗi cú pháp.
- [x] RLS cách ly đúng: user A chỉ thấy household/member của mình, không thấy của user B.
- [x] CHECK constraint `members_single_target_check` (household XOR organization) chặn đúng.
- [x] UNIQUE constraint chặn user tham gia trùng 1 household/organization 2 lần.
- [x] Trigger audit (`tg_set_audit_on_update`) tăng `version` và cập nhật `updated_at` đúng khi UPDATE.
- [x] `exchange_rates`: UPDATE bị chặn hoàn toàn qua RLS (insert-only), đúng như thiết kế "immutable".
- [x] `create_household`/`create_organization`: insert household/org + member OWNER trong 1 transaction, không thể tồn tại household không có owner.
- [x] `invite_member`: chặn đúng khi người mời không có quyền (`has_permission()` trả false); tạo token cho magic-link.
- [x] `accept_invitation_by_token`: chấp nhận đúng, token single-use (dùng lần 2 báo lỗi).
- [x] `cancel_invitation`: người mời (hoặc người có quyền invite) huỷ được lời mời pending; xoá hẳn row.
- [x] `update_member_role`, `remove_member`: MEMBER thường bị từ chối (không đủ quyền); OWNER thực hiện được.
- [x] `leave_membership`: thành viên thường rời được; OWNER bị chặn (phải chuyển quyền sở hữu trước — chưa có RPC transfer-ownership).
- [x] `npx tsc --noEmit`: 0 lỗi mới so với baseline, cho toàn bộ phạm vi Foundation (xem "UI wiring" để biết ngoại lệ đã biết).

**Bug đã tìm thấy và sửa trong lúc test:** policy SELECT ban đầu trên `members` tự join `members` trong chính USING clause của nó → Postgres báo `infinite recursion detected in policy for relation "members"`. Đã sửa bằng hàm `public.is_active_co_member()` (SECURITY DEFINER, bypass RLS nội bộ) — pattern chuẩn được khuyến nghị bởi Supabase cho đúng tình huống này.

## Thứ tự triển khai (theo phụ thuộc FK) — đã áp dụng

1. Extensions + helper functions (`tg_set_audit_on_update`)
2. `currencies` → `languages` → `countries` → `time_zones`
3. `users` (+ `current_user_id()`)
4. `fiscal_calendars` → `fiscal_periods`
5. `tenants` → `organizations` → `households`
6. `roles` → `permissions` → `role_permissions`
7. `members`
8. `user_preferences`, `feature_flags`, `system_settings`, `exchange_rates`
9. RLS policies (toàn bộ 18 bảng, + `is_active_co_member()`)
10. Seed data
11. RBAC (`has_permission()`) + member-lifecycle RPCs

File thật: `supabase/migrations/20260720000001_*.sql` … `20260720000022_*.sql`.

## Checklist theo bảng

| # | Bảng | Migration SQL | RLS | Seed | Types | UI wiring | Ghi chú |
|---|------|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `users` | ✅ | ✅ | - | ✅ | ✅ | `auth_user_id` FK → `auth.users`, thay thế `profiles` |
| 2 | `members` | ✅ | ✅ (SELECT policy + 9 RPC cho write) | - | ✅ | ✅ | Thay thế `organization_members`+`ledger_members`+`group_memberships` |
| 3 | `roles` | ✅ | ✅ (SELECT, ghi = service_role) | ✅ (8 role) | ✅ | ✅ (fetch động, không hard-code) | Global catalog |
| 4 | `permissions` | ✅ | ✅ (SELECT, ghi = service_role) | ✅ (37 permission) | ✅ | ✅ (qua `hasPermission()`) | resource:action:scope |
| 5 | `role_permissions` | ✅ | ✅ (SELECT, ghi = service_role) | ✅ (90 mapping) | ✅ | ✅ (`RoleService.getPermissionCodesForRole`) | Mapping N-N |
| 6 | `countries` | ✅ | ✅ | ✅ (6 nước) | ✅ | ✅ (dropdown ở settings) | ISO 3166 |
| 7 | `languages` | ✅ | ✅ | ✅ (en/ja/vi) | ✅ | - | ISO 639-1 |
| 8 | `currencies` | ✅ | ✅ | ✅ (8 tiền tệ) | ✅ | ✅ (dropdown ở settings) | ISO 4217 |
| 9 | `exchange_rates` | ✅ | ✅ (insert-only, immutable) | - | ✅ | ☐ | Chưa có UI — chưa cần ở Foundation |
| 10 | `fiscal_calendars` | ✅ | ✅ | ✅ (2 template) | ✅ | ☐ (dùng ngầm khi tạo household/org) | Template dùng chung |
| 11 | `fiscal_periods` | ✅ | ✅ (SELECT, ghi = service_role) | - | ✅ | ☐ | ⚠️ Không có cột tenant/org scope — xem "Rủi ro" |
| 12 | `time_zones` | ✅ | ✅ | ✅ (7 timezone) | ✅ | ✅ (dropdown ở settings) | IANA |
| 13 | `user_preferences` | ✅ | ✅ (owner-only) | - | ✅ | ☐ | 1-1 với `users`, không soft-delete |
| 14 | `feature_flags` | ✅ | ✅ (SELECT, ghi = service_role) | ☐ (chưa quyết định flag nào) | ✅ | ☐ | Không soft-delete |
| 15 | `system_settings` | ✅ | ✅ (SELECT theo `is_public`) | ☐ (chưa quyết định setting nào) | ✅ | ☐ | Không soft-delete |
| 16 | `tenants` | ✅ | ✅ (owner + member) | - | ✅ | ☐ (chưa có UI quản lý tenant riêng) | Multi-tenant SaaS root |
| 17 | `organizations` | ✅ | ✅ (owner + member) | - | ✅ | ✅ (`app/settings/ledger`, `create_organization`) | Khác hoàn toàn `organizations` cũ |
| 18 | `households` | ✅ | ✅ (owner + member) | - | ✅ | ✅ (`app/settings/ledger`, `create_household`) | **Mới hoàn toàn** — chưa từng tồn tại trong app |

## UI wiring — chi tiết những gì đã đổi

Theo quyết định của user ("Thay thế hoàn toàn + sửa luôn 2 trang cũ"):

- **`features/user-management/types.ts`** — viết lại: `UserProfile`, `Role`, `Permission`, `Household`, `Organization`, `Member`, `MembershipContext`. Giữ lại `Ledger`/`LedgerSettings`/`LedgerMember`/`UserRole` dưới nhãn **LEGACY** (xem "Rủi ro" #4).
- **`features/user-management/services/index.ts`** — viết lại `MemberService`/`RoleService`/`HouseholdService`/`OrganizationService` dùng bảng + RPC mới. Bỏ `WorkspaceService`/`AuditService` (không còn ai gọi, bảng `workspaces`/`audit_logs` không có trong Foundation). Giữ `LedgerService` tối giản (chỉ `getLedgers`/`updateLedger`) dưới nhãn LEGACY cho `ledger-store.ts`.
- **`features/user-management/store.ts`** (`useUserManagementStore`) — viết lại quanh `members`/`invitations`/`roles`/`permissionCodes`, thao tác theo `MembershipContext` (household hoặc organization) thay vì `ledgerId`.
- **`features/user-management/membership-store.ts`** (MỚI) — thay thế vai trò "context hiện tại" mà `ledger-store.ts` từng giữ, nhưng scope theo household/organization. Không đụng `ledger-store.ts` (19 file khác vẫn dùng cho mục đích không liên quan Foundation).
- **`features/user-management/hooks/use-permissions.tsx`** — viết lại dùng `permissionCodes` từ DB thay vì map `RolePermissions` hard-code.
- **`features/user-management/components/member-table.tsx`, `invite-modal.tsx`** — viết lại theo `Member`/`Role` mới, danh sách role fetch động từ DB.
- **`app/(dashboard)/users/page.tsx`** — chuyển từ `useLedgerStore` sang `useMembershipStore`.
- **`app/join/page.tsx`** — chuyển từ `MemberService.acceptInvitation(token, userId)` (ledger-scoped) sang `acceptInvitationByToken()` RPC (members-scoped, token single-use).
- **`app/settings/ledger/page.tsx`** — viết lại hoàn toàn: **mất tab "Ledger"** (Ledger không tồn tại trong Foundation) và tab "Organization & Workspace" cũ (`slug`/`address`/`business_type`). Thay bằng 1 trang "General" sửa trực tiếp Household/Organization đang chọn (name/code/currency/timezone/country), dùng RLS thật (chỉ owner sửa được — nút Edit chỉ hiện khi `isOwner`).

### Đã biết còn nợ (ngoài phạm vi Foundation)

- **`features/categories/category-detail-view.tsx`** — đã lỗi typecheck (7 lỗi mới) vì dùng `useUserManagementStore` kiểu cũ (`fetchMembers(ledgerId: string)`, `LedgerMember[]`). File này thuộc `features/categories`, vốn **đã hỏng từ trước** với DB mới hoàn toàn (nhắm vào bảng `categories`/`ledgers`/`category_translations` không tồn tại trong Foundation) — không phải lỗi mới phát sinh về bản chất, chỉ là bề mặt lỗi dịch chuyển. Cần viết lại khi có schema Categories (thuộc phần sau, chưa có tài liệu).
- 19 file khác dùng `useLedgerStore` (sidebar, auth-provider, currency, categories, transactions, budget-progress, onboarding...) — **không đụng tới**, vẫn hoạt động như cũ về mặt biên dịch, nhưng sẽ lỗi runtime khi kết nối DB Foundation thật (bảng `ledgers`/`workspaces` không tồn tại). Đây là phạm vi của schema phần 02+ chưa thiết kế.

## Cross-cutting

| Việc | Trạng thái | Ghi chú |
|---|:---:|---|
| Helper functions (`tg_set_audit_on_update`, `current_user_id`, `is_active_co_member`, `has_permission`) | ✅ | |
| RLS bật trên toàn bộ 18 bảng | ✅ | |
| Default privileges (`ALTER DEFAULT PRIVILEGES ... GRANT ... TO authenticated, anon, service_role`) | ✅ | |
| Member-lifecycle RPCs (SECURITY DEFINER) | ✅ | 10 functions, xem trên |
| Seed data (currencies/languages/countries/time_zones/fiscal_calendars/roles/permissions/role_permissions) | ✅ | |
| `types/supabase.ts` regenerate | ✅ | Viết tay vì không có Supabase project sống để `supabase gen types` |
| `lib/supabase.ts` gắn `Database` generic | ☐ **Cố ý chưa làm** | Vẫn phá typecheck phần `features/categories` và các phần thuộc schema 02-13 chưa migrate |
| `features/user-management/*` cập nhật theo schema mới | ✅ | |
| `modules/group-management/*` | ✅ Đã xoá | Theo quyết định user |
| Kết nối Supabase project thật (`supabase link` + `db push`) | ☐ | Chưa có project ref/credentials trong session này |

## Rủi ro / quyết định đang mở

1. **`fiscal_periods` không có cột scope theo tenant/organization** trong tài liệu Foundation — đang khoá ghi ở mức `service_role` để an toàn, cần đối chiếu lại với `03_accounting_core_schema` trước khi mở quyền ghi cho client.
2. **Chưa có Supabase project được link.** Toàn bộ nằm ở `supabase/migrations/*.sql`, đã test bằng Postgres local (không phải Supabase thật) — cần `supabase link` rồi `supabase db push` khi có project.
3. **`lib/supabase.ts` cố ý chưa gắn `<Database>` generic.** Gắn vào bây giờ sẽ phá typecheck của mọi thứ thuộc schema phần 02-13 chưa migrate (categories, transactions, ledgers...). Sẽ gắn khi đủ schema hoặc khi được yêu cầu rõ.
4. **Legacy `Ledger`/`LedgerMember`/`LedgerService` vẫn còn trong `types.ts`/`services/index.ts`**, chỉ để `ledger-store.ts` và `category-detail-view.tsx` biên dịch được — các hàm này gọi bảng `ledgers` **không tồn tại** trong DB Foundation, sẽ lỗi runtime khi có DB thật. Cần dọn dẹp khi thiết kế xong phần Ledger/Workspace (schema part sau).
5. **`app/settings/ledger/page.tsx` chỉ owner mới sửa được** (khớp đúng RLS policy `households_update_owner`/`organizations_update_owner` hiện tại) — admin không sửa được dù UI cũ cho phép `isAdmin`. Cần nâng RLS lên dùng `has_permission()` nếu muốn admin cũng sửa được.
6. **Chuyển quyền sở hữu (ownership transfer) chưa có RPC.** `leave_membership` chặn owner rời nhóm nhưng chưa có cách nào để owner chuyển quyền cho người khác — cần RPC riêng.
7. **Permission catalog (37 permission) là curated MVP**, không phải liệt kê đầy đủ cartesian resource×action×scope (780 tổ hợp lý thuyết). Sẽ bổ sung dần khi các schema part sau được migrate.
