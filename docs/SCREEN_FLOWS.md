# Leo Walletly — Mô tả màn hình & luồng sử dụng

> Đi kèm: `docs/database/SCHEMA_V2.md` **v2.1** (bảng/cột được nhắc tới ở đây; không dùng jsonb).
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
Hệ thống: /settings/profile · account · security · notifications · appearance · localization · texts 🆕 · languages 🆕 · ledger · audit-log · connected-apps · devices · privacy · developer  ·  /notifications
```

Quy tắc chuyển hướng (`components/auth/auth-provider.tsx`):
1. Chưa đăng nhập → `/login` (trừ `/join`, giữ token trong query để quay lại).
2. Đã đăng nhập mà `users.onboarded_at is null` và không có sổ nào → `/onboarding`.
3. Đã đăng nhập, đang ở `/login` → `user_preferences.start_page` (mặc định `/`).
4. Sổ đang chọn = `user_preferences.default_ledger_id`, nếu null thì lấy sổ đầu tiên của `ledger_members`.

---

## 1. Khung chung (có trên mọi màn hình sau đăng nhập)

### 1.0 Chữ hiển thị (áp dụng cho mọi màn hình)
- Mọi chữ giao diện lấy từ `translation_keys` + `translations` theo ngôn ngữ đang chọn, qua `/api/translations` (cache). `lib/i18n.ts` chỉ còn là bản dự phòng khi mất mạng.
- Chữ được đánh dấu `is_user_editable` (tên menu, tiêu đề trang, nhãn KPI, tên cột bảng) có thể **đổi ngay trên màn hình**: bật **編集モード** ở `/settings/texts` (mục 17) → các chữ sửa được có viền chấm; bấm vào → ô nhập + "この元帳に適用" (cho cả sổ) hoặc "自分だけ" (riêng mình) → lưu `translation_overrides`. "元に戻す" xoá override.
- Chuỗi có tham số (`{{count}} 件`) giữ nguyên tham số khi sửa; hệ thống chặn lưu nếu thiếu tham số (so với `translation_keys.placeholders`).

### 1.1 Sidebar (rộng 224px, ẩn trên mobile)
| Khu vực | Chức năng | Dữ liệu |
|---|---|---|
| Logo "Leo Walletly" | Bấm về `/` | — |
| **Bộ chuyển sổ** | Hiện tên sổ + tiền tệ (`Personal · JPY`). Bấm mở danh sách sổ có ✓ ở sổ đang chọn; chọn sổ khác → lưu `user_preferences.default_ledger_id` và tải lại dữ liệu (không cần reload cả trang). Cuối danh sách: "新しい元帳を作成" mở modal tạo sổ (tên, loại, tiền tệ, múi giờ) → RPC `create_ledger` | `ledgers`, `ledger_members` |
| Menu chính | ダッシュボード, 明細一覧, カレンダー, 分析 | — |
| 管理 | カテゴリ管理, 口座 🆕, ユーザー管理, 定期支出, 月次レポート | — |
| ツール | レシート読取, インポート | — |
| システム | 元帳設定, プロフィール | — |
| Chọn ngôn ngữ | Một nút cho mỗi dòng `languages.is_active = true` (hiện `short_label`). Thêm ngôn ngữ mới trong DB là nút tự xuất hiện, không sửa code. Bấm → tải chuỗi của ngôn ngữ đó (`get_ui_texts`), lưu `user_preferences.language_code` 🔧 (hiện chỉ lưu localStorage, danh sách 3 nút viết cứng) | `languages`, `user_preferences` |
| Phiên bản | `v0.3.0 · Leo Walletly` | — |

Mục đang chọn: nền xanh nhạt, chữ xanh đậm, vạch xanh bên trái.

### 1.2 TopBar (cao 48px)
| Khu vực | Chức năng |
|---|---|
| Breadcrumb | `Tên sổ › Tên trang · [JPY]` — tiền tệ lấy từ `ledgers.currency_code` 🔧 (hiện hiển thị USD giả) |
| Ô tìm kiếm / ⌘K | Mở Command Palette: tìm trang, tìm giao dịch theo nội dung, hành động nhanh ("取引を追加", "インポート") |
| Chuông 🔔 | Chấm xanh nếu có `notifications.read_at is null`. Bấm mở popover 5 thông báo mới nhất, "すべて既読にする", "すべての通知を見る" → `/notifications`. 🔧 hiện là dữ liệu giả |
| Avatar | Menu: tên + email, プロフィール, 開発者ツール (giữ, giai đoạn 3 → `/settings/developer`, bảng `api_tokens`; trước đó hiện nhãn "開発中"), ログアウト |

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
| 1. 目的 (purpose) | Thẻ đọc từ `ledger_types` (hiện: 個人, ビジネス, フリーランス; thêm "家族" chỉ cần thêm dòng) | Chọn "個人" → tên sổ tự điền "個人財務", nhảy thẳng bước 3. Bộ danh mục ban đầu = `ledger_types.default_template_code` |
| 2. 詳細 (details) | Ô tên sổ / tên doanh nghiệp | Bắt buộc với business/freelance |
| 3. 地域設定 (regional) | 通貨, タイムゾーン, ロケール, 会計年度開始 | Chọn JPY → tự đặt `ja-JP`, `Asia/Tokyo`, năm tài chính 01-01 (business: 04-01). VND → `vi-VN`, `Asia/Ho_Chi_Minh` |
| 4. 完了 (success) | Dấu ✓, "準備完了" | Tự chuyển `/` sau 2 giây |

**Khi bấm hoàn tất:** RPC `setup_onboarding` 🔧 (hiện gọi RPC không tồn tại → người dùng mới bị kẹt) tạo trong 1 transaction:
- `ledgers` (tên, `ledger_type`, tiền tệ, múi giờ, `fiscal_year_start_month`)
- `ledger_members` (OWNER)
- `categories` từ bộ mẫu (`apply_category_template`), tên theo `name_key` nên tự đổi theo ngôn ngữ
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
- **ユーザー** 🔧: giữ panel (UI đã có), thay dữ liệu giả bằng `ledger_members` (avatar, tên, email, vai trò); nút **招待** (đang tắt) mở modal mời như `/users`; dòng cuối "マルチユーザー管理" → `/users`.

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
Trượt từ phải: icon, số tiền lớn, nội dung; bảng: 日付, カテゴリ, アカウント, タイプ, ユーザー, ソース, メモ, タグ (`transaction_tags`); "元データ" nếu import: bảng 2 cột *tên cột gốc – giá trị* đọc từ `import_row_values` qua `transactions.import_row_id` 🔧 (hiện ghi "Dữ liệu gốc" cứng tiếng Việt); ảnh hoá đơn và các dòng hàng (`document_line_items`) nếu có `document_id`. Nút ✎ (sửa), phóng to, ✕. Nút dưới **取引を編集**.

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
| メモ | | |
| タグ | | Chọn hoặc gõ tạo mới → `tags`, `transaction_tags` |
| Đính kèm hoá đơn | | Tải ảnh → `documents` |

Lưu → INSERT/UPDATE `transactions`; lỗi → toast và **hoàn tác** 🔧 (hiện chỉ `console.error`). Xoá trong modal → xoá mềm, toast "元に戻す" 5 giây.

### 6.6 Thao tác hàng loạt
Chọn ô ☐ → thanh xanh: "N 件選択済み · tổng tiền", **カテゴリ変更**, **アカウント変更** 🔧 (2 nút này đã có UI nhưng đang bị tắt), **タグ追加** 🆕, **照合済みにする** 🆕 (`is_reconciled`), **削除**, ✕. Gọi `bulk_update_transactions` / `bulk_delete_transactions`.

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
- Dải 4 KPI: 今月の支出 · 残り予算 (% còn lại) · 自動分類率 (x/y 件) · 未照合 (số giao dịch `is_reconciled = false`, giữ đúng ý "Chờ đối soát" của UI hiện tại; bấm → `/transactions?reconciled=false`).
- Tab lọc: すべて · 有効 · 共有 · アーカイブ (kèm số lượng). 🗑️ tab "Định kỳ" (lọc theo loại `project` — không còn ý nghĩa).
- Lưới:
  - **Thẻ nổi bật** (rộng 2 cột): danh mục chi nhiều nhất tháng — nền màu gradient, loại, tổng chi, thanh ngân sách, 3 danh mục con.
  - **2 thẻ tối**: Tự phân loại (đã phân loại / tổng, %), Top 3 danh mục chi nhiều nhất.
  - **Thẻ danh mục**: icon, tên, số giao dịch, số tiền (đỏ nếu vượt), % ngân sách, thanh màu, chip "共有".
  - **Thẻ gợi ý phân loại** (rộng 2 cột): "N グループ · M 件が未分類", 4 dòng gợi ý (nội dung, nguồn, số tiền, danh mục gợi ý), **すべて見る** → `/categories/classify`, **N 件の提案を適用** → `apply_category_rules`.
  - **Ô thêm** (viền đứt): tạo danh mục; hoặc chọn **bộ mẫu** 旅行 / 家族 / 結婚式 (đọc `category_templates`, bấm → RPC `apply_category_template` tạo cả cây danh mục).
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
| 残高 | (danh mục chia sẻ) KPI "Trung bình / người", "Bạn đã trả"; bảng "Số dư từng người": đã trả, phải chịu, còn lại; gợi ý "A → B ¥x"; **精算する** tạo `settlements` | `v_member_balances`, `transaction_shares`, `settlements` |
| メンバー | Thành viên của danh mục chia sẻ (chọn từ thành viên sổ), vai trò "chủ nhóm" (`owner`), tỷ lệ chia (trống = chia đều); thêm / bỏ | `category_members` |
| 設定 | Sửa (modal 9.2), **統合** (merge → chọn danh mục đích), **アーカイブ**, **削除** (xác nhận; giao dịch chuyển về 未分類) | RPC `merge_categories` |

- Khối **連携口座** ("Tài khoản liên kết") ở tab 概要: tài khoản gắn với danh mục + số đã chi từ mỗi tài khoản; nút **口座を連携** (đang có UI, chưa có hành động) → chọn tài khoản, đánh dấu mặc định → `category_accounts`. Nguồn "Kết nối ngân hàng" hiện khi có `bank_connections` (giai đoạn 3).
- 🗑️ Nhãn giả trong code: huy hiệu "Mã hóa E2E" (app không mã hoá đầu-cuối), bảng màu cứng "MoMo / Vietcombank" (thay bằng `providers.color`).

### 9.4 Phân loại hàng loạt — `/categories/classify`
- Chọn tháng (← →), KPI: 未分類の支出, 未分類の収入, グループ数.
- Giao dịch chưa phân loại **gom nhóm theo nội dung giống nhau** (sắp theo 最多 / 金額 / 最新), mỗi nhóm hiện nguồn chính, số tiền.
- Mỗi nhóm: chọn danh mục → áp cho cả nhóm; ô "キーワードとして保存" → tạo `category_rules` để lần sau tự phân loại.

---

## 10. Tài khoản — `/accounts` 🆕
**Mục đích:** quản lý ví, ngân hàng, thẻ, tiền mặt (hiện chưa có, tài khoản chỉ là chuỗi enum).
- Nhóm theo loại (現金 / 銀行 / クレジットカード / 電子マネー / 投資): mỗi dòng có logo/màu, tên, 4 số cuối, số dư (`v_account_balances`), số giao dịch tháng này.
- Tổng tài sản ròng ở đầu trang.
- **口座を追加**: tên, loại (`account_types`), nhà cung cấp (`providers`, lọc theo vùng JP / VN / Global — quyết định parser khi import), tiền tệ, số dư đầu kỳ + ngày, hạn mức (thẻ), màu, "純資産に含める".
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
2. Kéo thả CSV/PDF. Parser **tự nhận diện** định dạng; nhận diện nhầm → đổi bằng thẻ nhà cung cấp (UI `ProviderCard` + tab vùng 🇯🇵 / 🇻🇳 / 🌐 đã có sẵn, nay đọc bảng `providers`: tên, mô tả theo ngôn ngữ, màu, CSV/PDF).
3. CSV chung → khung **列のマッピング** (日付, 内容, 金額 hoặc 支出/収入) + **再解析** → `import_column_mappings`; ô 🆕 "この口座に保存" lưu làm preset theo tài khoản, lần sau tự áp.
4. File đã import trước đó (`checksum` trùng) → cảnh báo vàng.

**Bước 2**
- 4 ô tổng: 取引総数, 収入, 支出, 収支.
- Bảng xem trước: ☐, ngày, nội dung, số tiền, danh mục gợi ý (sửa được), trạng thái 🆕 (新規 / **重複** mờ và bỏ chọn sẵn / エラー).
- "すべて選択 / 解除"; **{N} 件をインポート** → RPC `import_transactions` (bỏ trùng theo `external_id` / `dedupe_hash`, áp `category_rules`).
- Kết quả: "{N} 件のデータを追加しました · 重複 M 件をスキップ" → **ダッシュボードで確認** / **別のファイルをインポート**. Tạo `notifications (import_done)`.
- 🔧 Số tiền lưu dương + loại; tài khoản lưu đúng `account_id` (hiện bị mất).

**Dữ liệu:** `providers`, `import_jobs`, `import_column_mappings`, `import_rows`, `import_row_values`, `transactions`, `category_rules`.

---

## 16. Thông báo — `/notifications`
🔧 UI đã có (danh sách, lọc すべて / 未読, đánh dấu đã đọc) nhưng đang dùng mảng `NOTIFICATIONS` cứng 5 loại (Budget, Import, Report, Insight, Recurring).
- Danh sách theo ngày: icon + màu theo `notification_types.icon / severity`, tiêu đề và nội dung = chuỗi `title_key` / `body_key` đã dịch, thay `{{…}}` bằng `notification_params`; thời gian; chưa đọc có chấm.
- Bấm → đánh dấu đã đọc + đi tới `action_url`. **すべて既読にする**, **アーカイブ**.
- Lọc: すべて / 未読 + theo nhóm (`notification_categories`: 予算, インポート, レポート, インサイト, 定期, メンバー, セキュリティ).

**Dữ liệu:** `notifications`, `notification_params`, `notification_types`, `notification_categories`.

---

## 17. Cài đặt
Bố cục chung: menu trái (`SettingsSidebar`) + nội dung phải. **Giữ tất cả mục đã có UI** (kể cả trang đang `ComingSoon`) vì đã có bảng dự định; mục chưa làm hiện nhãn "開発中". 🗑️ Chỉ xoá các trang **chuyển hướng** thừa: `/settings/organization`, `/organizations`, `/workspace`, `/(dashboard)/ledger`. `/profile` (trang tổng quan cá nhân) giữ làm trang "マイページ" dẫn tới các mục bên dưới.

| Trang | Hiện trạng | Chức năng mục tiêu | Dữ liệu | Giai đoạn |
|---|---|---|---|---|
| **プロフィール** `/settings/profile` | Có UI, đọc/ghi `users` | Avatar (bucket `avatars`), 表示名, 姓, 名, 電話, 生年月日, 性別, 国. Email chỉ đọc | `users` | 1 |
| **アカウント設定** `/settings/account` | Có UI, ghi sai cột | 既定の通貨, 日付形式, 週の開始日, 表示密度, 残高を隠す, 開始ページ | `user_preferences` | 1 |
| **セキュリティ** `/settings/security` | Có UI, dữ liệu giả | Thẻ trạng thái (MFA, passkey, mức rủi ro); đổi mật khẩu; đổi email; bật MFA (Supabase TOTP); **phiên đăng nhập**: thiết bị, trình duyệt, OS, IP, vị trí, rủi ro, "現在のセッション", **取り消し**; **アカウント削除** | `user_sessions`, Supabase Auth | 2 |
| **通知設定** `/settings/notifications` | Có UI ma trận, ghi cột không tồn tại | Hàng = `notification_categories`, cột = `notification_channels` (kênh `is_available = false` hiện mờ "近日公開"); bật/tắt từng ô; nhóm `is_mandatory` khoá kênh in-app | `user_notification_settings` | 2 |
| **外観** `/settings/appearance` | Có UI, chỉ `useState` | テーマ light / dark / system, áp ngay | `user_preferences.theme` | 1 |
| **地域と言語** `/settings/localization` | Có UI, chỉ localStorage | 言語 (danh sách từ `languages` active), ロケール, タイムゾーン (`time_zones`) | `user_preferences`, `languages`, `time_zones` | 1 |
| **表示テキスト** `/settings/texts` 🆕 | Chưa có | Bảng các chữ sửa được (lọc theo màn hình = `namespace`): cột *mặc định* – *của sổ* – *của tôi*; sửa trực tiếp hoặc bật **編集モード** để sửa ngay trên màn hình (mục 1.0); "すべて元に戻す" | `translation_keys`, `translations`, `translation_overrides` | 2 |
| **言語管理** `/settings/languages` 🆕 (quản trị hệ thống) | Chưa có | Danh sách ngôn ngữ + % đã dịch (`v_translation_coverage`); **言語を追加** (mã, tên, fallback); bảng dịch theo key với trạng thái draft / machine / approved; bật `is_active` để phát hành | `languages`, `translations` | 3 |
| **元帳設定** `/settings/ledger` | Có UI (household/org) | 名前, タイプ (`ledger_types`), 通貨, タイムゾーン, 国, 会計年度開始月, ID; vùng nguy hiểm: アーカイブ, 削除, オーナー移譲 | `ledgers` | 1 |
| **アクティビティログ** `/settings/audit-log` | Có UI, đọc bảng không tồn tại | Dòng thời gian ai – làm gì – lúc nào – đối tượng (`entity_label`); mở rộng một dòng → bảng *trường / trước / sau*; lọc theo loại; OWNER/ADMIN/AUDITOR xem cả sổ | `audit_logs`, `audit_log_changes` | 2 |
| **連携アプリ** `/settings/connected-apps` | `ComingSoon` | Danh sách `providers.supports_api`; **接続** → OAuth nhà cung cấp → `bank_connections`; trạng thái, lần đồng bộ cuối, **再接続 / 切断** | `bank_connections` | 3 |
| **デバイス** `/settings/devices` | `ComingSoon` | Danh sách thiết bị tin cậy (`is_trusted`), đổi tên thiết bị, bỏ tin cậy | `user_sessions` | 2 |
| **プライバシー** `/settings/privacy` | `ComingSoon` | **データをエクスポート** (chọn sổ, CSV/XLSX) → `data_requests` → thông báo khi xong, link tải hết hạn; **削除をリクエスト** | `data_requests` | 3 |
| **開発者ツール** `/settings/developer` | Mục menu bị khoá | Tạo / thu hồi API token (hiện token 1 lần, prefix, quyền read/write, hạn dùng, lần dùng cuối) | `api_tokens` | 3 |

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
