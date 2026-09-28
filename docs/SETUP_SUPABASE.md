# Hướng dẫn thiết lập Supabase, tạo database và chạy thử ở máy local

Tài liệu này gồm 2 cách chạy:

- **Cách A – Supabase chạy ngay trên máy (Docker):** nhanh, không cần tài khoản, dữ liệu chỉ nằm trên máy. Nên dùng để phát triển và test.
- **Cách B – Supabase trên cloud (supabase.com):** dùng project thật; app vẫn chạy ở `localhost` nhưng nối vào database trên cloud.

Cả hai cách dùng chung bộ migration trong `supabase/migrations/` (schema v2.1, xem `docs/database/SCHEMA_V2.md`).

---

## 0. Chuẩn bị

| Công cụ | Phiên bản | Dùng cho |
|---|---|---|
| Node.js | 20 trở lên | chạy app, Supabase CLI (qua `npx`) |
| Git | bất kỳ | lấy code |
| Docker Desktop (hoặc Docker Engine) | đang chạy | chỉ cần cho **Cách A** |

```bash
git clone https://github.com/thangyugi/leo-walletly.git
cd leo-walletly
npm install
```

Supabase CLI đã có sẵn trong `devDependencies`, gọi bằng `npx supabase ...` (không cần cài riêng).

---

## Cách A – Supabase chạy local bằng Docker

### A1. Khởi động Supabase

```bash
npx supabase start
```

Lần đầu mất vài phút để tải image. Lệnh này tự áp dụng toàn bộ migration trong `supabase/migrations/` (17 file tạo bảng/view/RPC/RLS + seed, và file 18 sửa ngày mở tài khoản). Khi xong, terminal in ra các địa chỉ:

```
Project URL  http://127.0.0.1:54321
Database URL postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio       http://127.0.0.1:54323      ← giao diện quản lý DB trên trình duyệt
```

> Nếu mạng chặn kho image mặc định (`public.ecr.aws`), tải từ Docker Hub:
> `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`

### A2. Lấy URL và key

```bash
npx supabase status -o env
```

Lấy 2 giá trị `API_URL` và `ANON_KEY`.

### A3. Tạo file `.env.local`

Copy từ mẫu rồi điền 2 giá trị trên:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

`.env.local` đã nằm trong `.gitignore`, không bị commit.

### A4. Chạy app

```bash
npm run dev
```

Mở http://localhost:3000 → chuyển sang phần **Kiểm tra sau khi chạy** bên dưới.

### A5. Các lệnh hay dùng

| Việc | Lệnh |
|---|---|
| Xoá sạch DB local và tạo lại từ migration | `npx supabase db reset` |
| Dừng Supabase (giữ dữ liệu) | `npx supabase stop` |
| Dừng và xoá dữ liệu | `npx supabase stop --no-backup` |
| Xem trạng thái / địa chỉ | `npx supabase status` |
| Mở Studio | http://127.0.0.1:54323 |

Local mặc định **không yêu cầu xác nhận email** (`supabase/config.toml` → `[auth.email] enable_confirmations = false`), nên đăng ký xong là dùng được ngay.

---

## Cách B – Supabase trên cloud

### B1. Tạo project

1. Đăng nhập https://supabase.com/dashboard → **New project**.
2. Đặt tên, chọn region gần bạn (ví dụ Tokyo `ap-northeast-1`), đặt **Database password** và lưu lại mật khẩu này.
3. Đợi project khởi tạo xong (1–2 phút).

### B2. Nối CLI với project

```bash
npx supabase login                       # mở trình duyệt để đăng nhập
npx supabase link --project-ref <ref>    # <ref> lấy trong URL dashboard: /project/<ref>
```

CLI sẽ hỏi Database password ở bước B1.

### B3. Tạo database từ migration

**Project mới (DB trống):**

```bash
npx supabase db push
```

**Project cũ đang có schema/dữ liệu cũ, muốn làm sạch rồi tạo lại:**

```bash
npx supabase db reset --linked
```

> ⚠️ `db reset --linked` **xoá toàn bộ dữ liệu** trên project cloud rồi chạy lại migration. Hãy sao lưu trước nếu cần (Dashboard → Database → Backups, hoặc `npx supabase db dump --linked -f backup.sql`).

Kiểm tra: Dashboard → **Table Editor** phải thấy 54 bảng; bảng `translations` khoảng 3.750 dòng.

### B4. Cấu hình Auth cho chạy local

Dashboard → **Authentication**:

- **URL Configuration** → *Site URL*: `http://localhost:3000`; *Redirect URLs*: thêm `http://localhost:3000/**`.
- **Sign In / Providers → Email** → *Confirm email*:
  - Bật (mặc định trên cloud): sau khi đăng ký phải bấm link trong email mới đăng nhập được.
  - Tắt: đăng ký xong dùng ngay, tiện khi test.

### B5. Lấy URL và key

Dashboard → **Project Settings → API Keys** (hoặc nút **Connect**):

- **Project URL**: `https://<ref>.supabase.co`
- **Publishable key** (`sb_publishable_...`) hoặc **anon key** (bản legacy): dùng key nào cũng được.

> Không dùng **secret / service_role key** trong app. Key này bỏ qua toàn bộ RLS.

### B6. Tạo `.env.local` và chạy

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable hoặc anon key>
```

```bash
npm run dev
```

### B7. Lưu ý riêng cho cloud

- **Giới hạn 1.000 dòng mỗi request** (Project Settings → Data API → *Max rows*). App đã đọc theo trang ở những chỗ cần, **không cần tăng** giới hạn này.
- **pg_cron** (tự sinh giao dịch định kỳ, hết hạn lời mời): migration `..._storage_cron.sql` tự bật nếu project có extension này. Trên cloud có thể bật ở Dashboard → Database → Extensions → `pg_cron`, rồi chạy lại `npx supabase db push`. Khi chưa có cron, app vẫn tự chạy giao dịch định kỳ còn thiếu mỗi lần mở sổ.
- **Storage buckets** (`avatars`, `receipts`, `imports`, `exports`) do migration tạo, không cần tạo tay.

---

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | có | URL API của Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | có | publishable / anon key |
| `GEMINI_API_KEY` | không | chỉ cho màn **Quét hóa đơn** (`/scan`); thiếu thì màn đó báo chưa cấu hình |
| `DATABASE_URL` | không | chỉ dùng khi sinh lại type: `npm run db:types` |

---

## Kiểm tra sau khi chạy (checklist test local)

### 1. Đăng ký và khởi tạo sổ

1. Mở http://localhost:3000 → tự chuyển tới `/login`.
2. Bấm **Chưa có tài khoản? Đăng ký ngay**, nhập tên, email (ví dụ `test@example.com`) và mật khẩu (Supabase yêu cầu tối thiểu 6 ký tự), rồi bấm **Tạo tài khoản**.
3. Tới `/onboarding`: chọn **Cá nhân** → kiểm tra tiền tệ, ngôn ngữ, múi giờ → **Hoàn tất thiết lập**.
4. Vào **Tổng quan**. Sổ mới có sẵn một tài khoản tiền mặt và bộ danh mục mặc định. Tên của chúng được lưu theo ngôn ngữ lúc tạo sổ, ví dụ tạo bằng tiếng Nhật thì tên là 現金.
5. Đổi ngôn ngữ ở góc dưới thanh bên (日本 / VN / US) rồi tải lại trang (F5): ngôn ngữ phải được giữ nguyên.

### 2. Nạp dữ liệu mẫu

Thư mục `test/fixtures/import/` có các file sao kê mẫu:

| File | Loại | Nhận diện thành |
|---|---|---|
| `Transactions_20260401-20260430.csv` | PayPay (bản tiếng Anh) | PayPay, 121 giao dịch |
| `detail202604(7414).csv` | Thẻ PayPay | Thẻ PayPay, 18 giao dịch |
| `statement_202604 2.pdf` | PayPay, bản PDF | PayPay, 9 giao dịch |

Vào **Nhập dữ liệu** → kéo file vào → kiểm tra bảng xem trước → **Nhập N giao dịch**. Nếu chưa có tài khoản cùng nhà cung cấp, app tự tạo (PayPay, Thẻ PayPay). Nhập lại cùng file thì các dòng trùng được đánh dấu và bỏ chọn sẵn.

> Dữ liệu mẫu nằm ở tháng 3–4/2026. Ở các màn có chọn tháng, lùi về **Tháng 4/2026** để xem.

### 3. Danh sách kiểm tra theo màn

| Màn | Việc cần thử | Kết quả mong đợi |
|---|---|---|
| Tổng quan `/` | Lùi về tháng 4/2026 | 4 thẻ số liệu, biểu đồ dòng tiền, giao dịch gần đây, số dư tài khoản khác 0 |
| Giao dịch `/transactions` | **Thêm giao dịch** với nội dung chứa từ khoá của một danh mục | Lưu xong, giao dịch tự vào đúng danh mục |
| | Bấm một dòng → **Chỉnh sửa** → đổi số tiền → Lưu | Số tiền được cập nhật |
| | Chỉnh sửa → **Xoá** → **Hoàn tác** ở thông báo | Giao dịch biến mất rồi hiện lại |
| | Tick 2 dòng → **Đổi danh mục** | Thông báo "Đã cập nhật 2 giao dịch" |
| | Lọc, tìm kiếm, sắp xếp, phân trang | Danh sách thay đổi tương ứng |
| Quản lý danh mục `/categories` | **Tạo danh mục mới** kèm từ khoá | Thẻ mới xuất hiện |
| | Bấm thẻ danh mục | Trang chi tiết: ảnh bìa, tab, 5 ô số liệu |
| | Bấm một nhóm con | Mở trang riêng, breadcrumb `Danh mục › Cha › Con` |
| | Tab **Cài đặt** → Lưu trữ / Đang hoạt động / Gộp / Xoá | Thao tác đúng, có thông báo |
| Phân loại `/categories/classify` | Chọn danh mục cho một nhóm → **Áp dụng** | Nhóm biến mất, từ khoá được lưu vào danh mục |
| Phân tích `/analytics` | Xem nhãn trục tháng | Theo định dạng khu vực (xem mục 4) |
| Lịch `/calendar` | Lùi về tháng 4, bấm một ngày | Tiêu đề ngày theo định dạng khu vực, danh sách giao dịch của ngày |
| Cài đặt → Khu vực & ngôn ngữ | Đổi **Định dạng khu vực** | Nhãn ngày/tháng toàn app đổi theo |

### 4. Định dạng ngày/tháng theo khu vực

| Định dạng khu vực | Tháng | Ngày |
|---|---|---|
| ja-JP | 2026/04 | 2026/04/28 |
| vi-VN | 04/2026 | 28/04/2026 |
| en-GB | 04/2026 | 28/04/2026 |
| en-US | 04/2026 | 04/28/2026 |

Chưa chọn định dạng khu vực thì app theo ngôn ngữ giao diện.

### 5. Xem dữ liệu trong database

- **Local:** Studio http://127.0.0.1:54323, hoặc `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Cloud:** Dashboard → Table Editor / SQL Editor

Câu truy vấn kiểm tra nhanh:

```sql
select a.name, v.balance from v_account_balances v join financial_accounts a on a.id = v.account_id;
select count(*) from transactions where deleted_at is null;
select language_code, count(*) from translations group by 1;   -- mỗi ngôn ngữ ~1.250 dòng
```

---

## Sau khi sửa schema hoặc chuỗi dịch

| Thay đổi | Việc cần làm |
|---|---|
| Thêm/sửa migration | tạo file mới trong `supabase/migrations/` → `npx supabase db reset` (local) hoặc `npx supabase db push` (cloud) |
| Cập nhật type TypeScript | `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run db:types` |
| Sửa `lib/i18n.ts` | `npm run db:i18n-seed` (sinh lại migration seed bản dịch) → reset/push DB |
| Kiểm tra trước khi commit | `npx tsc --noEmit` và `npm run build` |

---

## Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Console báo "Missing NEXT_PUBLIC_SUPABASE_URL…" | Chưa có `.env.local`, hoặc sửa xong chưa khởi động lại `npm run dev` |
| Chữ hiện dạng khoá, ví dụ `ledger_type.personal.name` | Chưa chạy seed bản dịch: reset/push lại DB; kiểm tra bảng `translations` có dữ liệu |
| Đăng ký xong không đăng nhập được (cloud) | Đang bật *Confirm email*: mở email xác nhận, hoặc tắt ở Authentication → Email |
| `supabase start` báo không kết nối được Docker | Mở Docker Desktop rồi chạy lại |
| `supabase start` lỗi tải image (403 / Forbidden) | Dùng `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start` |
| Cổng 54321/54322/3000 đã bị chiếm | `npx supabase stop`, tắt tiến trình đang dùng cổng, hoặc chạy app ở cổng khác: `npm run dev -- -p 3001` (khi đó sửa Site URL tương ứng) |
| Số dư tài khoản bằng 0 dù có giao dịch | DB cũ chưa có migration `20260928000018_account_opening_date.sql`: chạy `db push` / `db reset` |
| Màn Quét hóa đơn báo chưa cấu hình | Thêm `GEMINI_API_KEY` vào `.env.local` |
