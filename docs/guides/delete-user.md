# Xoá một người dùng

## Tóm tắt

Mỗi người dùng nằm ở **hai nơi** trong Supabase:

| Nơi | Chứa gì |
|---|---|
| `auth.users` (Authentication → Users) | Tài khoản đăng nhập: email, mật khẩu |
| `public.users` (Table Editor) | Hồ sơ trong app: tên, ngôn ngữ… — sổ cái gắn vào đây |

Muốn xoá **hẳn** một người thì phải xoá cả hai, **và trước đó xoá các sổ cái họ làm chủ**.
Cách đơn giản nhất: chạy hàm `admin_delete_user` trong SQL Editor (Cách 1).

> ⚠️ Xoá là **vĩnh viễn**, không có nút hoàn tác. Supabase gói Free không có bản sao lưu để khôi phục từng dòng.

---

## Trước khi làm

- [ ] Đã đẩy migration `20260928000041_admin_delete_user.sql` lên cloud (`npx supabase db push`). Kiểm tra:
  ```sql
  select 1 from pg_proc where proname = 'admin_delete_user';
  ```
  Có 1 dòng là được. Không có → dùng Cách 2.
- [ ] Biết **email** hoặc **id** của người cần xoá.
- [ ] Biết người đó có **dùng chung sổ** với ai không (xem bước 1).
- [ ] Nếu là dữ liệu thật: xuất dữ liệu cần giữ (CSV) trước khi xoá.

---

## Cách 1 — Dùng hàm `admin_delete_user` (khuyên dùng)

### Bước 1. Xem người đó có gì

Supabase Dashboard → **SQL Editor** → New query, dán (thay email):

```sql
select u.id, u.email,
       l.name  as so_cai,
       (select count(*) from public.ledger_members m
         where m.ledger_id = l.id and m.user_id <> u.id and m.status = 'active') as so_nguoi_dung_chung
from auth.users u
left join public.ledgers l on l.owner_user_id = u.id
where u.email = 'email@example.com';
```

- `so_cai` trống → người đó chưa có sổ nào.
- `so_nguoi_dung_chung` > 0 → sổ đó **đang có người khác dùng**. Đọc mục "Lưu ý" trước khi xoá.

### Bước 2. Xoá

```sql
select public.admin_delete_user('email@example.com');
```

Có thể dùng id thay cho email: `select public.admin_delete_user('781ed672-ba5e-…');`

Kết quả trả về một dòng, ví dụ:

```
deleted email@example.com (781ed672-…) and 1 ledger(s)
```

Hàm làm theo thứ tự:
1. Xoá các khoản thanh toán (`settlements`) liên quan đến người đó.
2. Xoá các **sổ cái họ làm chủ** → kéo theo giao dịch, danh mục, tài khoản, thành viên… trong sổ.
3. Xoá tài khoản đăng nhập (`auth.users`) → kéo theo hồ sơ `public.users` và cài đặt.

### Bước 3. Nếu bị từ chối vì sổ dùng chung

Thông báo:
```
User … owns 1 ledger(s) shared with other members. Transfer ownership first, or call admin_delete_user('…', true) …
```

Chọn một trong hai:
- **Giữ sổ cho người khác** (khuyên dùng): người chủ sổ đăng nhập app → **Quản lý thành viên** → ở dòng thành viên muốn giao sổ, bấm **Chuyển quyền chủ sổ**. Sau đó chạy lại Bước 2.
- **Xoá luôn sổ cho tất cả mọi người** (chỉ khi chắc chắn):
  ```sql
  select public.admin_delete_user('email@example.com', true);
  ```

---

## Cách 2 — Chạy lệnh SQL trực tiếp (khi chưa có hàm)

Thay `<ID>` bằng id của người dùng (lấy ở Authentication → Users, cột UID):

```sql
begin;
delete from public.settlements where from_user_id = '<ID>' or to_user_id = '<ID>';
delete from public.ledgers     where owner_user_id = '<ID>';
delete from auth.users         where id = '<ID>';
delete from public.users       where id = '<ID>';
commit;
```

Cách này **không kiểm tra sổ dùng chung** — sổ nào người đó làm chủ đều bị xoá, kể cả sổ người khác đang dùng.

---

## Kiểm tra lại

```sql
select
  (select count(*) from auth.users   where email = 'email@example.com') as con_dang_nhap,
  (select count(*) from public.users where email = 'email@example.com') as con_ho_so;
```

Cả hai phải là `0`. Sau đó thử đăng nhập bằng email đó trong app → phải thấy
"Chưa có tài khoản nào khớp với email này".

---

## Ưu / nhược điểm và lưu ý

### Cách 1 — `admin_delete_user`
| 👍 Ưu điểm | 👎 Nhược điểm |
|---|---|
| Một lệnh, đúng thứ tự, không sót dữ liệu | Phải đẩy migration 0041 trước |
| Tự chặn khi sổ đang dùng chung | Vẫn xoá vĩnh viễn, không hoàn tác |
| Nhận cả email hoặc id; báo `not found` nếu gõ sai | Chỉ chạy được trong SQL Editor (đây cũng là điểm an toàn) |

### Cách 2 — SQL trực tiếp
| 👍 Ưu điểm | 👎 Nhược điểm |
|---|---|
| Không cần migration nào | Không kiểm tra sổ dùng chung → dễ xoá nhầm dữ liệu người khác |
| Thấy rõ từng bước | Phải tự lấy đúng id, gõ sai là xoá nhầm người |

### Lưu ý quan trọng
- **Không** chỉ xoá dòng trong `public.users` (Table Editor). Tài khoản đăng nhập vẫn còn → người đó vẫn đăng nhập được, rồi vào lại Onboarding (app sẽ tự tạo lại hồ sơ trống cho họ).
- **Không** chỉ xoá ở Authentication → Users khi người đó còn sổ cái: Supabase sẽ báo lỗi khoá ngoại `ledgers_owner_user_id_fkey`.
- **Không** đổi "on delete" của khoá ngoại sang `cascade` như Supabase gợi ý: khi đó xoá một người sẽ âm thầm xoá cả sổ dùng chung của người khác.
- Giao dịch người đó đã nhập trong **sổ của người khác** vẫn được giữ lại; cột "người nhập" chỉ trở thành trống.
- Người đang mở app lúc bị xoá: lần tải trang tiếp theo app tự đăng xuất và báo "Tài khoản không còn tồn tại…".
- Ảnh hoá đơn đã tải lên (Storage, bucket `receipts`) **không** tự xoá theo. Muốn dọn: Storage → `receipts` → xoá thư mục có tên là id sổ cái.
- Email đã xoá có thể **đăng ký lại** như người mới.

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `function public.admin_delete_user(...) does not exist` | Chưa đẩy migration 0041 | `npx supabase db push`, hoặc dùng Cách 2 |
| `… is still referenced from table ledgers` | Người đó còn sổ cái | Dùng Cách 1, hoặc chạy đủ các dòng của Cách 2 |
| `owns N ledger(s) shared with other members` | Sổ đang dùng chung | Xem Bước 3 |
| `permission denied for function admin_delete_user` | Gọi từ app / API, không phải SQL Editor | Chỉ chạy trong SQL Editor của Supabase |
| `not found: …` | Sai email/id, hoặc đã xoá rồi | Kiểm tra lại ở Authentication → Users |
