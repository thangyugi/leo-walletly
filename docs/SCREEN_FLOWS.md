# Leo Walletly — Mô tả màn hình & luồng sử dụng

> Đi kèm: `docs/database/SCHEMA_V2.md` (bảng/cột được nhắc tới ở đây).
> Thiết kế trực quan: canvas **Walletly App Screens** (Dashboard, 明細一覧, カテゴリ管理, 分析, カレンダー, インポート, ログイン, Sidebar, TopBar).
> Mỗi màn hình ghi rõ: **Hiện tại** (code đang có) → **Mục tiêu** (sau khi dựng lại DB). Ký hiệu: 🆕 mới · 🔧 sửa · 🗑️ bỏ.

---

## 0. Bản đồ luồng

```
/login ──(đăng ký/đăng nhập)──► chưa onboarded? ──► /onboarding ──► /
   ▲                               └─ có lời mời? ─► /join?token=… ──► /
   │
   └── Đăng xuất (TopBar › menu người dùng)

Khung chung (sau đăng nhập): Sidebar │ TopBar │ nội dung │ Command Palette (⌘K)

Chính:    /  ·  /transactions  ·  /calendar  ·  /analytics
Quản lý:  /categories (/categories/[slug], /categories/classify)  ·  /accounts 🆕  ·  /users  ·  /recurring  ·  /monthly-report
Công cụ:  /scan  ·  /import
Hệ thống: /settings/ledger  ·  /settings/profile  ·  /settings/account  ·  /settings/security  ·  /settings/notifications  ·  /settings/audit-log  ·  /notifications
```

Quy tắc chuyển hướng (`components/auth/auth-provider.tsx`):
1. Chưa đăng nhập → `/login` (trừ `/join`, giữ token trong query để quay lại).
2. Đã đăng nhập mà `users.onboarded_at is null` và không có sổ nào → `/onboarding`.
3. Đã đăng nhập, đang ở `/login` → `user_preferences.start_page` (mặc định `/`).
4. Sổ đang chọn = `user_preferences.default_ledger_id`, nếu null thì lấy sổ đầu tiên của `ledger_members`.

---

## 1. Khung chung (có trên mọi màn hình sau đăng nhập)

### 1.1 Sidebar (rộng 224px, ẩn trên mobile)
| Khu vực | Chức năng | Dữ liệu |
|---|---|---|
| Logo "Leo Walletly" | Bấm về `/` | — |
| **Bộ chuyển sổ** | Hiện tên sổ + tiền tệ (`Personal · JPY`). Bấm mở danh sách sổ có ✓ ở sổ đang chọn; chọn sổ khác → lưu `user_preferences.default_ledger_id` và tải lại dữ liệu (không cần reload cả trang). Cuối danh sách: "新しい元帳を作成" mở modal tạo sổ (tên, loại, tiền tệ, múi giờ) → RPC `create_ledger` | `ledgers`, `ledger_members` |
| Menu chính | ダッシュボード, 明細一覧, カレンダー, 分析 | — |
| 管理 | カテゴリ管理, 口座 🆕, ユーザー管理, 定期支出, 月次レポート | — |
| ツール | レシート読取, インポート | — |
| システム | 元帳設定, プロフィール | — |
| Chọn ngôn ngữ | 3 nút ja / vi / en. Bấm → đổi ngôn ngữ ngay, lưu `user_preferences.language_code` 🔧 (hiện chỉ lưu localStorage) | `user_preferences` |
| Phiên bản | `v0.3.0 · Leo Walletly` | — |

Mục đang chọn: nền xanh nhạt, chữ xanh đậm, vạch xanh bên trái.

### 1.2 TopBar (cao 48px)
| Khu vực | Chức năng |
|---|---|
| Breadcrumb | `Tên sổ › Tên trang · [JPY]` — tiền tệ lấy từ `ledgers.currency_code` 🔧 (hiện hiển thị USD giả) |
| Ô tìm kiếm / ⌘K | Mở Command Palette: tìm trang, tìm giao dịch theo nội dung, hành động nhanh ("取引を追加", "インポート") |
| Chuông 🔔 | Chấm xanh nếu có `notifications.read_at is null`. Bấm mở popover 5 thông báo mới nhất, "すべて既読にする", "すべての通知を見る" → `/notifications`. 🔧 hiện là dữ liệu giả |
| Avatar | Menu: tên + email, プロフィール, ログアウト. 🗑️ bỏ mục "開発者ツール" |

### 1.3 Mobile (< 768px)
`MobileHeader`: nút menu mở Sidebar dạng ngăn kéo, tên trang, chuông. Bảng giao dịch chuyển thành danh sách thẻ 1 cột; lưới bento danh mục 1 cột.

---

## 2. Đăng nhập / Đăng ký — `/login`
**Mục đích:** vào app hoặc tạo tài khoản.

**Bố cục:** thẻ kính mờ 420px giữa màn hình: logo ví, "Leo Walletly", dòng phụ, form, đường kẻ "または", liên kết chuyển chế độ.

**Luồng đăng nhập**
1. Nhập **メールアドレス** + **パスワード** → bấm **ログイン**.
2. `supabase.auth.signInWithPassword`. Lỗi → hộp đỏ ở đầu form (sai mật khẩu / chưa xác nhận email).
3. Thành công → áp quy tắc chuyển hướng ở mục 0.

**Luồng đăng ký**
1. Bấm "アカウントがありませんか？ 今すぐ登録" → form thêm ô **表示名**.
2. `supabase.auth.signUp` (metadata `display_name`) → trigger tạo `users` + `user_preferences` (ngôn ngữ = ngôn ngữ đang chọn trên màn login).
3. Bật xác nhận email: hộp xanh "確認メールを送信しました". Tắt: vào thẳng `/onboarding`.

**Bổ sung** 🆕: "パスワードをお忘れですか？" (`resetPasswordForEmail`), nút chọn ngôn ngữ ở góc, đăng nhập Google (tuỳ chọn).

**Dữ liệu:** `auth.users` → trigger → `users`, `user_preferences`.

---

## 3. Onboarding — `/onboarding`
**Mục đích:** tạo sổ đầu tiên. 4 bước có thanh tiến trình, nút ← quay lại.

| Bước | Nội dung | Thao tác |
|---|---|---|
| 1. 目的 (purpose) | 3 thẻ: 個人 (personal), ビジネス (business), フリーランス (freelance) | Chọn "個人" → tên sổ tự điền "個人財務", nhảy thẳng bước 3 |
| 2. 詳細 (details) | Ô tên sổ / tên doanh nghiệp | Bắt buộc với business/freelance |
| 3. 地域設定 (regional) | 通貨, タイムゾーン, ロケール, 会計年度開始 | Chọn JPY → tự đặt `ja-JP`, `Asia/Tokyo`, năm tài chính 01-01 (business: 04-01). VND → `vi-VN`, `Asia/Ho_Chi_Minh` |
| 4. 完了 (success) | Dấu ✓, "準備完了" | Tự chuyển `/` sau 2 giây |

**Khi bấm hoàn tất:** RPC `setup_onboarding` 🔧 (hiện gọi RPC không tồn tại → người dùng mới bị kẹt) tạo trong 1 transaction:
- `ledgers` (tên, `ledger_type`, tiền tệ, múi giờ, `fiscal_year_start_month`)
- `ledger_members` (OWNER)
- 12 `categories` mặc định
- `financial_accounts` "現金" (cash)
- set `users.onboarded_at`, `user_preferences.default_ledger_id`

Lỗi → toast đỏ, giữ nguyên bước để thử lại.

---

## 4. Nhận lời mời — `/join?token=…`
1. Chưa đăng nhập → chuyển `/login?next=/join?token=…`; sau đăng nhập/đăng ký quay lại.
2. Gọi `get_invitation(token)` → thẻ: "**{người mời}** さんが **{tên sổ}** に招待しました · 役割: メンバー".
3. Nút **参加する** → `accept_invitation(token)` → "チームへようこそ！" → chuyển `/` với sổ vừa tham gia được chọn. Nút **辞退** → `decline_invitation`.
4. Token sai / hết hạn / đã dùng / email không khớp → thông báo lỗi + "ホームに戻る".
5. Người mới đăng ký qua lời mời **bỏ qua onboarding** (đã có sổ).

**Dữ liệu:** `ledger_invitations`, `ledger_members`.

---

## 5. Dashboard — `/`
**Mục đích:** tổng quan thu chi của kỳ đang chọn.

**Đầu trang:** tiêu đề "ダッシュボード" + phụ đề; bên phải: bộ chọn kỳ **‹ 9月 2026 ›** (mở lịch chọn ngày / tháng / quý / năm / tuỳ chọn), **取引を追加** 🔧 (hiện bị tắt → mở modal thêm giao dịch, mục 6.5), **データをインポート** → `/import`.

**4 thẻ KPI** (mỗi thẻ có % so với kỳ trước, xanh ▲ / đỏ ▼):
| Thẻ | Công thức mục tiêu | Ghi chú |
|---|---|---|
| 総残高 | Tổng `v_account_balances.balance` với `include_in_net_worth` | 🔧 hiện tính sai (thu − chi của kỳ) |
| 入金 | Tổng thu trong kỳ | `v_monthly_summary` |
| 出金 | Tổng chi trong kỳ (loại `exclude_from_reports`) | |
| 収支 | Thu − chi trong kỳ | 🔧 thay thẻ "予備" (tính trên 1000 dòng đã tải) |

**Cột trái (2/3):**
- **キャッシュフロー**: cột xanh (thu) / đỏ (chi) 6 tháng gần nhất; di chuột hiện số tiền. Bấm 1 tháng → `/transactions` lọc tháng đó.
- **最近の取引 · N 件**: 8 giao dịch mới nhất (icon chữ viết tắt, nội dung, ngày, chip danh mục, chip tài khoản, số tiền). Bấm dòng → panel chi tiết (mục 6.3). "すべて見る" → `/transactions`.

**Cột phải (1/3):**
- **アカウント**: từng tài khoản + số dư (`v_account_balances`), bấm → `/transactions?account=`. Trống → "口座を追加" → `/accounts`.
- **予算** 🆕: 3 danh mục dùng ngân sách nhiều nhất (thanh tiến độ xanh / vàng ≥ 80% / đỏ > 100%).
- **概要**: 入金 / 出金 / 収支バランス của kỳ.
- **財務のヒント**: gợi ý đặt từ khoá, bấm → `/categories/classify`.
- 🗑️ Panel "ユーザー" dữ liệu giả → chuyển sang `/users` (hoặc hiện avatar thật của thành viên).

**Trạng thái trống:** chưa có giao dịch → thẻ lớn "財務管理を始めましょう" + **今すぐインポート** + **取引を追加**.

**Dữ liệu:** `v_monthly_summary`, `v_account_balances`, `v_category_monthly`, `transactions` (8 dòng).

---

## 6. Giao dịch — `/transactions`
**Mục đích:** xem, tìm, sửa, xoá, thêm giao dịch.

### 6.1 Đầu trang & thống kê
- Tiêu đề "取引履歴", phụ đề số giao dịch.
- Bộ chọn kỳ, **並べ替え** (日付 最新/古い, 金額 高い/低い, 名前 A-Z, カテゴリ), **取引を追加** 🆕, **インポート**, 🗑️ nút "全削除" (xoá toàn bộ — quá nguy hiểm; thay bằng xoá hàng loạt theo lựa chọn).
- 4 thẻ: 入金, 出金, 件数 (chi · thu), 平均・支出.

### 6.2 Tìm kiếm & lọc
- Ô **取引を検索...**: tìm theo nội dung, cửa hàng, ghi chú (server, trigram).
- **フィルター** mở hàng lọc: タイプ, アカウント, カテゴリ (kể cả "未分類"), ユーザー 🆕, 開始日, 終了日, タグ 🆕. Số bộ lọc đang bật hiện trên nút; **クリア** xoá lọc.
- Lọc & phân trang chạy **ở server** 🔧 (hiện tải 1000 dòng rồi lọc ở client).

### 6.3 Danh sách
- Cột: ☐ · icon · 内容 · 日付 · ユーザー (người trả) · カテゴリ · アカウント · 金額.
- Sắp theo ngày → nhóm theo ngày, đầu nhóm "27/09/2026 (日)" + thu/chi/ròng của ngày.
- Cuối bảng: số dòng, tổng chi, tổng thu. Phân trang 30 dòng/trang.
- 🔧 Chip danh mục & tài khoản lấy từ `categories` / `financial_accounts` (hiện tra hằng số → giao dịch import hiện trống).

### 6.4 Panel chi tiết (bấm 1 dòng)
Trượt từ phải: icon, số tiền lớn, nội dung; bảng: 日付, カテゴリ, アカウント, タイプ, ユーザー, ソース, メモ, タグ; "元データ" (`raw_data`) nếu import 🔧 (hiện ghi "Dữ liệu gốc" cứng tiếng Việt); ảnh hoá đơn nếu có `document_id`. Nút ✎ (sửa), phóng to, ✕. Nút dưới **取引を編集**.

### 6.5 Modal thêm / sửa giao dịch 🆕 (thêm) / 🔧 (sửa)
| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| タイプ | ✅ | Tab 支出 / 収入 / 振替 |
| 金額 | ✅ | Luôn dương, định dạng theo tiền tệ |
| 通貨 | | Mặc định tiền của sổ; khác → hiện tỷ giá |
| 日付 (+ 時刻) | ✅ | |
| アカウント | ✅ | Chuyển khoản: thêm "振替先" |
| カテゴリ | | Chọn dạng cây; gợi ý từ `category_rules` khi gõ nội dung |
| 内容 | ✅ | |
| 支払者 | | Mặc định chính mình; danh mục chia sẻ → mục "分担" (chia đều / tuỳ chỉnh) → `transaction_shares` |
| メモ, タグ | | |
| Đính kèm hoá đơn | | Tải ảnh → `documents` |

Lưu → INSERT/UPDATE `transactions`; lỗi → toast và **hoàn tác** 🔧 (hiện chỉ `console.error`). Xoá trong modal → xoá mềm, toast "元に戻す" 5 giây.

### 6.6 Thao tác hàng loạt
Chọn ô ☐ → thanh xanh: "N 件選択済み · tổng tiền", **カテゴリ変更**, **アカウント変更**, **タグ追加**, **削除**, ✕. Gọi `bulk_update_transactions` / `bulk_delete_transactions`.

**Trạng thái trống:** "取引がありません" + **インポート**; có lọc mà không kết quả: "結果が見つかりません" + **クリア**.

---

## 7. Lịch — `/calendar`
- Tiêu đề "月別カレンダー"; 3 thẻ: 支出 / 収入 / 収支 của tháng.
- Lưới tháng (日→土, theo `week_starts_on`): mỗi ô có ngày, −chi (đỏ), +thu (xanh) dạng rút gọn (¥7.9K). Hôm nay viền xám, ngày chọn nền xanh; ngày không có giao dịch mờ.
- ‹ › đổi tháng.
- Bấm ngày → cột phải "2026/09/25 · 2 件": danh sách giao dịch; bấm 1 giao dịch → modal sửa. 🆕 nút "+" thêm giao dịch cho ngày đó.
- 🆕 Chấm tím ở ngày có giao dịch định kỳ sắp tới (`recurring_rules.next_run_date`).

**Dữ liệu:** `v_daily_summary`, `transactions` theo ngày.

---

## 8. Phân tích — `/analytics`
- **月別支出トレンド**: cột thu/chi 6 (🆕 chọn 6/12) tháng.
- **カテゴリ別**: donut chi theo danh mục + chú thích 6 mục lớn nhất; bấm lát → `/categories/[slug]`. 🔧 dùng danh mục thật (hiện donut rỗng với dữ liệu import).
- **収支推移**: đường vùng thu − chi theo tháng.
- 🆕 **予算アラート**: danh mục vượt/sắp vượt ngân sách (chuỗi i18n đã có sẵn).
- 🆕 Bộ chọn kỳ & lọc tài khoản giống Dashboard.

**Dữ liệu:** `v_monthly_summary`, `v_category_monthly`.

---

## 9. Danh mục — `/categories`
🔧 Toàn bộ chữ trên trang đang viết cứng tiếng Việt → chuyển vào `lib/i18n.ts`.

### 9.1 Trang tổng (bento)
- Đầu trang: tên trang, `Tên sổ · JPY`, ô tìm danh mục, **新しいカテゴリ**.
- Dải 4 KPI: 今月の支出 · 残り予算 (% còn lại) · 自動分類率 (x/y 件) · 要確認 (số giao dịch `needs_review`) 🔧 (thay "Chờ đối soát").
- Tab lọc: すべて · 有効 · 共有 · アーカイブ (kèm số lượng). 🗑️ tab "Định kỳ" (lọc theo loại `project` — không còn ý nghĩa).
- Lưới:
  - **Thẻ nổi bật** (rộng 2 cột): danh mục chi nhiều nhất tháng — nền màu gradient, loại, tổng chi, thanh ngân sách, 3 danh mục con.
  - **2 thẻ tối**: Tự phân loại (đã phân loại / tổng, %), Top 3 danh mục chi nhiều nhất.
  - **Thẻ danh mục**: icon, tên, số giao dịch, số tiền (đỏ nếu vượt), % ngân sách, thanh màu, chip "共有".
  - **Thẻ gợi ý phân loại** (rộng 2 cột): "N グループ · M 件が未分類", 4 dòng gợi ý (nội dung, nguồn, số tiền, danh mục gợi ý), **すべて見る** → `/categories/classify`, **N 件の提案を適用** → `apply_category_rules`.
  - **Ô thêm** (viền đứt): tạo danh mục; gợi ý mẫu 旅行 / 家族 / 結婚式.
  - **Dải lưu trữ**: danh mục đã lưu trữ + ngày; "アーカイブをすべて見る".
- Dải gợi ý cuối trang: đặt từ khoá, **キーワード管理を開く**.

### 9.2 Modal tạo / sửa danh mục (`category-form`)
名前, タイプ (支出/収入/振替), 親カテゴリ, アイコン, カラー, 月額予算 + 警告しきい値 (%) → `budgets`, キーワード (gõ + Enter → `category_rules`), 共有 (bật chia tiền). 🗑️ các loại cost center / department / project / team / subsidiary.

### 9.3 Chi tiết — `/categories/[slug]`
Tab (giữ cấu trúc hiện tại, đổi sang i18n):
| Tab | Nội dung | Dữ liệu |
|---|---|---|
| 概要 | Tổng chi tháng, ngân sách, biểu đồ 6 tháng, hoạt động gần đây | `v_category_monthly` |
| サブカテゴリ | Danh sách con, **サブカテゴリを作成** | `categories` |
| キーワード | Danh sách quy tắc (pattern, số lần khớp), thêm/xoá, bật "インポート時に自動適用" | `category_rules` |
| 取引 | Tab phụ すべて / 自動 / 要確認; đổi danh mục từng dòng | `transactions` |
| 残高 | (danh mục chia sẻ) Ai đã trả, ai nợ ai, **精算済みにする** | `v_member_balances`, `transaction_shares` |
| メンバー | Thành viên tham gia chia tiền | `ledger_members` |
| 設定 | Sửa (modal 9.2), **統合** (merge → chọn danh mục đích), **アーカイブ**, **削除** (xác nhận; giao dịch chuyển về 未分類) | RPC `merge_categories` |

🗑️ Các nhãn giả trong code: "MoMo", "Vietcombank", "Mã hóa E2E", "Kết nối ngân hàng".

### 9.4 Phân loại hàng loạt — `/categories/classify`
- Chọn tháng (← →), KPI: 未分類の支出, 未分類の収入, グループ数.
- Giao dịch chưa phân loại **gom nhóm theo nội dung giống nhau** (sắp theo 最多 / 金額 / 最新), mỗi nhóm hiện nguồn chính, số tiền.
- Mỗi nhóm: chọn danh mục → áp cho cả nhóm; ô "キーワードとして保存" → tạo `category_rules` để lần sau tự phân loại.

---

## 10. Tài khoản — `/accounts` 🆕
**Mục đích:** quản lý ví, ngân hàng, thẻ, tiền mặt (hiện chưa có, tài khoản chỉ là chuỗi enum).
- Nhóm theo loại (現金 / 銀行 / クレジットカード / 電子マネー / 投資): mỗi dòng có logo/màu, tên, 4 số cuối, số dư (`v_account_balances`), số giao dịch tháng này.
- Tổng tài sản ròng ở đầu trang.
- **口座を追加**: tên, loại, nhà cung cấp (danh sách `PROVIDERS` — quyết định parser khi import), tiền tệ, số dư đầu kỳ + ngày, hạn mức (thẻ), màu, "純資産に含める".
- Bấm tài khoản → `/transactions?account=`; menu: sửa, lưu trữ (ẩn khỏi chọn), xoá (chỉ khi chưa có giao dịch).

**Dữ liệu:** `financial_accounts`, `v_account_balances`.

---

## 11. Thành viên — `/users`
- Tiêu đề "メンバー管理 · {tên sổ}".
- 3 thẻ: 総メンバー数, アクティブ, 保留中の招待.
- Ô tìm theo tên/vai trò.
- **Bảng thành viên**: avatar, tên, email, vai trò (dropdown nếu có quyền `member.update`), ngày tham gia, ⋯ (削除). OWNER có huy hiệu, không sửa được; 🆕 "オーナー権限を移譲" (chỉ OWNER).
- **Lời mời đang chờ**: email, vai trò, ngày hết hạn, **リンクをコピー**, **取り消し**.
- **メンバーを招待** (modal): email, vai trò (ADMIN / MEMBER / VIEWER, có mô tả quyền), lời nhắn → RPC `invite_member` → hiện link `/join?token=` để sao chép (+ gửi email qua Edge Function). 🔧 Mời được cả email chưa có tài khoản.
- Thành viên thường: chỉ xem; nút **元帳を退出** (OWNER không có).

**Dữ liệu:** `ledger_members`, `ledger_invitations`, `roles`.

---

## 12. Định kỳ — `/recurring`
- Tiêu đề "定期支出" + **定期支出を追加**.
- 🆕 Tổng chi cố định mỗi tháng ở đầu trang.
- Danh sách: tên, số tiền, tần suất (毎月 25日), tài khoản, danh mục, lần tới (`next_run_date`), công tắc bật/tắt, ✎, 🗑.
- Form: 内容, 金額, タイプ, アカウント, カテゴリ, 頻度 (毎日/毎週/毎月/毎年 + mỗi N), 日 (ngày trong tháng/thứ), 開始日, 終了日, "自動で記帳" (tắt → giao dịch sinh ra ở trạng thái chờ + thông báo xác nhận), メモ.
- 🔧 Giao dịch được **server** sinh mỗi ngày (pg_cron), không còn tính `applied_months` ở client.
- 🆕 Mục "確認待ち": giao dịch `status='pending'` từ định kỳ → **確認** / **スキップ**.

**Dữ liệu:** `recurring_rules`, `transactions (source='recurring')`.

---

## 13. Báo cáo tháng — `/monthly-report`
- Chọn tháng ‹ ›; 3 thẻ 収入 / 支出 / 収支 + so sánh tháng trước.
- **カテゴリ別**: bảng danh mục, số tiền, %, ngân sách, chênh lệch.
- Top giao dịch lớn nhất tháng; theo tài khoản 🆕; theo thành viên 🆕 (sổ nhiều người).
- **エクスポート** 🔧: CSV / PDF (cần `report.export`).

**Dữ liệu:** `v_monthly_summary`, `v_category_monthly`, `transactions`.

---

## 14. Quét hoá đơn — `/scan`
Các bước (state hiện có: `idle → previewing → scanning → confirming → saved / error`):
1. **Tải ảnh**: kéo thả / chọn / chụp bằng camera (mobile). JPG, PNG, HEIC ≤ 10MB. Ảnh lên bucket `receipts` → tạo `documents (ocr_status='pending')`.
2. **Xem trước** ảnh, **読み取り開始** / **リセット**.
3. **Đang phân tích**: `/api/scan-receipt` (Gemini) → cập nhật `documents.ocr_result`, `extracted_*`.
4. **Xác nhận**: form điền sẵn 店名・内容, 金額, 日付, カテゴリ (gợi ý), アカウント 🆕, メモ; ảnh bên cạnh; dòng "…として記録されます".
5. **Lưu** → `transactions (source='scan', document_id)` → "取引を正常に保存しました" + **もう一度読み取る** / "取引を見る".
6. **Lỗi / không đọc được** → nhập tay với ảnh vẫn được đính kèm.

---

## 15. Import — `/import`
Thanh bước: **① ソース選択・アップロード → ② 確認・インポート**.

**Bước 1**
1. 🆕 Chọn **tài khoản đích** (dropdown `financial_accounts`; chưa có → tạo nhanh).
2. Kéo thả CSV/PDF. Parser **tự nhận diện** định dạng (PayPay, PayPayカード, Rakuten Pay, SMBC, MUFG, Vietcombank, MB Bank, CSV chung); nhận diện nhầm → đổi nhà cung cấp thủ công.
3. CSV chung → khung **列のマッピング** (日付, 内容, 金額 hoặc 支出/収入) + **再解析**.
4. File đã import trước đó (`checksum` trùng) → cảnh báo vàng.

**Bước 2**
- 4 ô tổng: 取引総数, 収入, 支出, 収支.
- Bảng xem trước: ☐, ngày, nội dung, số tiền, danh mục gợi ý (sửa được), trạng thái 🆕 (新規 / **重複** mờ và bỏ chọn sẵn / エラー).
- "すべて選択 / 解除"; **{N} 件をインポート** → RPC `import_transactions` (bỏ trùng theo `external_id` / `dedupe_hash`, áp `category_rules`).
- Kết quả: "{N} 件のデータを追加しました · 重複 M 件をスキップ" → **ダッシュボードで確認** / **別のファイルをインポート**. Tạo `notifications (import_done)`.
- 🔧 Số tiền lưu dương + loại; tài khoản lưu đúng `account_id` (hiện bị mất).

**Dữ liệu:** `import_jobs`, `import_rows`, `transactions`, `category_rules`.

---

## 16. Thông báo — `/notifications`
- Danh sách theo ngày: icon theo loại, tiêu đề, nội dung (dịch từ `title_key` + `params`), thời gian; chưa đọc có chấm.
- Bấm → đánh dấu đã đọc + đi tới `action_url`. **すべて既読にする**. Lọc: すべて / 未読 / 予算 / インポート / メンバー.

**Dữ liệu:** `notifications`.

---

## 17. Cài đặt
Bố cục chung: menu trái (`SettingsSidebar`) + nội dung phải. 🗑️ Ẩn các mục chưa làm: 連携アプリ, デバイス, プライバシー, 地域と言語 (gộp vào "アカウント設定"). 🗑️ Xoá trang chuyển hướng `/settings/organization`, `/organizations`, `/workspace`, `/(dashboard)/ledger`, và `/profile` (trùng `/settings/profile`).

| Trang | Chức năng | Dữ liệu |
|---|---|---|
| **元帳設定** `/settings/ledger` | Xem/sửa sổ đang chọn: 名前, タイプ, 通貨 (cảnh báo nếu đã có giao dịch), タイムゾーン, 国, 会計年度開始月, ID hệ thống (sao chép). 🆕 Vùng nguy hiểm: **アーカイブ**, **削除** (OWNER), **オーナー移譲**. Người có `ledger.update` mới sửa được | `ledgers` |
| **プロフィール** `/settings/profile` | Avatar (tải lên / xoá → bucket `avatars`), 表示名, 姓, 名, 電話, 生年月日, 性別, 国. Email chỉ đọc (đổi qua mục Bảo mật) | `users` |
| **アカウント設定** `/settings/account` | 言語, ロケール, タイムゾーン, 既定の通貨, 日付形式, 週の開始日, テーマ, 表示密度 (comfortable/compact), 残高を隠す, 開始ページ 🔧 (hiện ghi sai tên cột) | `user_preferences` |
| **セキュリティ** `/settings/security` | Đổi mật khẩu, đổi email (xác nhận qua mail), MFA (Supabase TOTP), **phiên đăng nhập thật** (`list_my_sessions`) + thu hồi, **アカウント削除** (`delete_my_account`) 🔧 (hiện dữ liệu giả Chrome/macOS/Tokyo) | `auth.*` qua RPC |
| **通知設定** `/settings/notifications` | Ma trận loại thông báo × kênh (アプリ内 / メール) | `user_preferences.notification_settings` |
| **アクティビティログ** `/settings/audit-log` | Dòng thời gian: ai, làm gì, lúc nào, trên đối tượng nào; lọc theo loại; OWNER/ADMIN xem cả sổ | `audit_logs` |

---

## 18. Trạng thái dùng chung
| Trạng thái | Cách hiển thị |
|---|---|
| Đang tải | Skeleton đúng hình khối (`components/ui/skeleton.tsx`) |
| Trống | Icon + câu mô tả + 1 nút hành động chính (`EmptyState`) |
| Lỗi tải | Hộp lỗi + **再試行** (`async-state.tsx`) |
| Lưu thành công / thất bại | Toast (sonner); thất bại thì hoàn tác thay đổi lạc quan |
| Không đủ quyền (VIEWER) | Ẩn nút ghi; nếu vào URL trực tiếp → thông báo "権限がありません" |
| Ẩn số dư | `hide_balances` → mọi số tiền hiện `¥•••••`, bấm 👁 để hiện tạm |

## 19. Phân quyền theo màn hình (tóm tắt)
| Màn hình | VIEWER | MEMBER | ADMIN | OWNER |
|---|:-:|:-:|:-:|:-:|
| Dashboard, Lịch, Phân tích, Báo cáo (xem) | ✅ | ✅ | ✅ | ✅ |
| Thêm / sửa giao dịch, Import, Quét | | ✅ | ✅ | ✅ |
| Xoá giao dịch | | | ✅ | ✅ |
| Danh mục, Tài khoản, Ngân sách, Định kỳ (ghi) | | ✅ | ✅ | ✅ |
| Mời / đổi vai trò / xoá thành viên | | | ✅ | ✅ |
| Sửa cài đặt sổ | | | ✅ | ✅ |
| Xoá sổ, chuyển quyền sở hữu | | | | ✅ |
