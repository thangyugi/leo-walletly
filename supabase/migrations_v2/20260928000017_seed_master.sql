-- Master data + lookup seed (runs after 20260928000016_seed_translations.sql,
-- which loads the UI strings generated from lib/i18n.ts).
-- Every display name here goes through translation_keys/translations, so a new
-- language only needs new rows in `translations`.

create or replace function public._seed_t(
  p_key varchar, p_ja text, p_vi text, p_en text, p_placeholders varchar default null
)
returns varchar
language plpgsql
as $$
begin
  insert into public.translation_keys (key, namespace, placeholders)
  values (p_key, split_part(p_key, '.', 1), p_placeholders)
  on conflict (key) do update set placeholders = coalesce(excluded.placeholders, translation_keys.placeholders);
  insert into public.translations (key, language_code, value) values
    (p_key, 'ja', p_ja), (p_key, 'vi', p_vi), (p_key, 'en', p_en)
  on conflict (key, language_code) do update set value = excluded.value;
  return p_key;
end;
$$;

-- Currencies ------------------------------------------------------------------
insert into public.currencies (code, numeric_code, name_key, symbol, decimal_places, sort_order) values
  ('JPY', '392', public._seed_t('currency.JPY.name', '日本円', 'Yên Nhật', 'Japanese Yen'), '¥', 0, 1),
  ('VND', '704', public._seed_t('currency.VND.name', 'ベトナムドン', 'Đồng Việt Nam', 'Vietnamese Dong'), '₫', 0, 2),
  ('USD', '840', public._seed_t('currency.USD.name', '米ドル', 'Đô la Mỹ', 'US Dollar'), '$', 2, 3),
  ('EUR', '978', public._seed_t('currency.EUR.name', 'ユーロ', 'Euro', 'Euro'), '€', 2, 4),
  ('GBP', '826', public._seed_t('currency.GBP.name', '英ポンド', 'Bảng Anh', 'British Pound'), '£', 2, 5),
  ('KRW', '410', public._seed_t('currency.KRW.name', '韓国ウォン', 'Won Hàn Quốc', 'South Korean Won'), '₩', 0, 6),
  ('CNY', '156', public._seed_t('currency.CNY.name', '人民元', 'Nhân dân tệ', 'Chinese Yuan'), '¥', 2, 7),
  ('SGD', '702', public._seed_t('currency.SGD.name', 'シンガポールドル', 'Đô la Singapore', 'Singapore Dollar'), 'S$', 2, 8),
  ('THB', '764', public._seed_t('currency.THB.name', 'タイバーツ', 'Baht Thái', 'Thai Baht'), '฿', 2, 9),
  ('AUD', '036', public._seed_t('currency.AUD.name', '豪ドル', 'Đô la Úc', 'Australian Dollar'), 'A$', 2, 10)
on conflict (code) do nothing;

-- Time zones (country FK filled after countries) ------------------------------
insert into public.time_zones (code, name_key, utc_offset_minutes) values
  ('Asia/Tokyo', public._seed_t('timezone.asia_tokyo.name', '東京 (GMT+9)', 'Tokyo (GMT+9)', 'Tokyo (GMT+9)'), 540),
  ('Asia/Ho_Chi_Minh', public._seed_t('timezone.asia_ho_chi_minh.name', 'ホーチミン (GMT+7)', 'TP. Hồ Chí Minh (GMT+7)', 'Ho Chi Minh (GMT+7)'), 420),
  ('Asia/Seoul', public._seed_t('timezone.asia_seoul.name', 'ソウル (GMT+9)', 'Seoul (GMT+9)', 'Seoul (GMT+9)'), 540),
  ('Asia/Shanghai', public._seed_t('timezone.asia_shanghai.name', '上海 (GMT+8)', 'Thượng Hải (GMT+8)', 'Shanghai (GMT+8)'), 480),
  ('Asia/Singapore', public._seed_t('timezone.asia_singapore.name', 'シンガポール (GMT+8)', 'Singapore (GMT+8)', 'Singapore (GMT+8)'), 480),
  ('Asia/Bangkok', public._seed_t('timezone.asia_bangkok.name', 'バンコク (GMT+7)', 'Bangkok (GMT+7)', 'Bangkok (GMT+7)'), 420),
  ('Australia/Sydney', public._seed_t('timezone.australia_sydney.name', 'シドニー (GMT+10)', 'Sydney (GMT+10)', 'Sydney (GMT+10)'), 600),
  ('Europe/London', public._seed_t('timezone.europe_london.name', 'ロンドン (GMT+0)', 'London (GMT+0)', 'London (GMT+0)'), 0),
  ('America/New_York', public._seed_t('timezone.america_new_york.name', 'ニューヨーク (GMT-5)', 'New York (GMT-5)', 'New York (GMT-5)'), -300),
  ('UTC', public._seed_t('timezone.utc.name', '協定世界時 (UTC)', 'Giờ UTC', 'Coordinated Universal Time'), 0)
on conflict (code) do nothing;

insert into public.countries (code, code3, name_key, currency_code, default_timezone_code, default_locale, phone_code) values
  ('JP', 'JPN', public._seed_t('country.JP.name', '日本', 'Nhật Bản', 'Japan'), 'JPY', 'Asia/Tokyo', 'ja-JP', '+81'),
  ('VN', 'VNM', public._seed_t('country.VN.name', 'ベトナム', 'Việt Nam', 'Vietnam'), 'VND', 'Asia/Ho_Chi_Minh', 'vi-VN', '+84'),
  ('KR', 'KOR', public._seed_t('country.KR.name', '韓国', 'Hàn Quốc', 'South Korea'), 'KRW', 'Asia/Seoul', 'ko-KR', '+82'),
  ('CN', 'CHN', public._seed_t('country.CN.name', '中国', 'Trung Quốc', 'China'), 'CNY', 'Asia/Shanghai', 'zh-CN', '+86'),
  ('SG', 'SGP', public._seed_t('country.SG.name', 'シンガポール', 'Singapore', 'Singapore'), 'SGD', 'Asia/Singapore', 'en-SG', '+65'),
  ('TH', 'THA', public._seed_t('country.TH.name', 'タイ', 'Thái Lan', 'Thailand'), 'THB', 'Asia/Bangkok', 'th-TH', '+66'),
  ('AU', 'AUS', public._seed_t('country.AU.name', 'オーストラリア', 'Úc', 'Australia'), 'AUD', 'Australia/Sydney', 'en-AU', '+61'),
  ('GB', 'GBR', public._seed_t('country.GB.name', 'イギリス', 'Vương quốc Anh', 'United Kingdom'), 'GBP', 'Europe/London', 'en-GB', '+44'),
  ('US', 'USA', public._seed_t('country.US.name', 'アメリカ', 'Hoa Kỳ', 'United States'), 'USD', 'America/New_York', 'en-US', '+1')
on conflict (code) do nothing;

update public.time_zones z set country_code = c.code
from public.countries c where c.default_timezone_code = z.code and z.country_code is null;

-- Account types & providers --------------------------------------------------
insert into public.account_types (code, name_key, icon, is_liability, sort_order) values
  ('cash', public._seed_t('account_type.cash.name', '現金', 'Tiền mặt', 'Cash'), 'banknote', false, 1),
  ('bank', public._seed_t('account_type.bank.name', '銀行口座', 'Tài khoản ngân hàng', 'Bank account'), 'landmark', false, 2),
  ('credit_card', public._seed_t('account_type.credit_card.name', 'クレジットカード', 'Thẻ tín dụng', 'Credit card'), 'credit-card', true, 3),
  ('e_wallet', public._seed_t('account_type.e_wallet.name', '電子マネー・QR決済', 'Ví điện tử', 'E-wallet'), 'smartphone', false, 4),
  ('investment', public._seed_t('account_type.investment.name', '投資', 'Đầu tư', 'Investment'), 'trending-up', false, 5),
  ('loan', public._seed_t('account_type.loan.name', 'ローン', 'Khoản vay', 'Loan'), 'hand-coins', true, 6),
  ('other', public._seed_t('account_type.other.name', 'その他', 'Khác', 'Other'), 'wallet', false, 7)
on conflict (code) do nothing;

select public._seed_t('account.default.cash', '現金', 'Tiền mặt', 'Cash');

insert into public.providers (code, name_key, description_key, account_type_code, region, country_code, color, initials, parser_code, supports_csv, supports_pdf, sort_order) values
  ('paypay', public._seed_t('provider.paypay.name', 'PayPay', 'PayPay', 'PayPay'),
    public._seed_t('provider.paypay.description', 'PayPay 取引履歴 CSV / PDF', 'Lịch sử giao dịch PayPay CSV / PDF', 'PayPay transaction history CSV / PDF'),
    'e_wallet', 'jp', 'JP', '#FF0033', 'PP', 'paypay', true, true, 1),
  ('paypay_card', public._seed_t('provider.paypay_card.name', 'PayPayカード', 'Thẻ PayPay', 'PayPay Card'),
    public._seed_t('provider.paypay_card.description', 'PayPayクレジットカード明細 CSV', 'Sao kê thẻ PayPay CSV', 'PayPay Credit Card statement CSV'),
    'credit_card', 'jp', 'JP', '#8B1AFF', 'PC', 'paypay_card', true, false, 2),
  ('rakuten_pay', public._seed_t('provider.rakuten_pay.name', '楽天ペイ', 'Rakuten Pay', 'Rakuten Pay'),
    public._seed_t('provider.rakuten_pay.description', '楽天ペイ 取引明細 CSV / PDF', 'Lịch sử giao dịch Rakuten Pay CSV / PDF', 'Rakuten Pay transaction history CSV / PDF'),
    'e_wallet', 'jp', 'JP', '#BF0000', 'RP', 'rakuten_pay', true, true, 3),
  ('smbc', public._seed_t('provider.smbc.name', '三井住友銀行', 'Ngân hàng SMBC', 'SMBC'),
    public._seed_t('provider.smbc.description', '三井住友銀行 口座明細 CSV', 'Sao kê tài khoản Sumitomo Mitsui CSV', 'SMBC bank account statement CSV'),
    'bank', 'jp', 'JP', '#00A040', 'SM', 'smbc', true, false, 4),
  ('mufg', public._seed_t('provider.mufg.name', '三菱UFJ銀行', 'Ngân hàng MUFG', 'MUFG Bank'),
    public._seed_t('provider.mufg.description', '三菱UFJ銀行 口座明細 CSV', 'Sao kê tài khoản MUFG CSV', 'MUFG bank account statement CSV'),
    'bank', 'jp', 'JP', '#D40000', 'MU', 'mufg', true, false, 5),
  ('vcb', public._seed_t('provider.vcb.name', 'Vietcombank', 'Vietcombank', 'Vietcombank'),
    public._seed_t('provider.vcb.description', 'Vietcombank 口座明細 CSV', 'Sao kê tài khoản Vietcombank CSV', 'Vietcombank bank account statement CSV'),
    'bank', 'vn', 'VN', '#007A3D', 'VB', 'vcb', true, false, 6),
  ('mbbank', public._seed_t('provider.mbbank.name', 'MB Bank', 'MB Bank', 'MB Bank'),
    public._seed_t('provider.mbbank.description', 'MB Bank 口座明細 CSV', 'Lịch sử giao dịch MB Bank CSV', 'MB Bank transaction history CSV'),
    'bank', 'vn', 'VN', '#8B0000', 'MB', 'mbbank', true, false, 7),
  ('generic_csv', public._seed_t('provider.generic_csv.name', 'CSV汎用', 'CSV chung', 'Generic CSV'),
    public._seed_t('provider.generic_csv.description', '任意のCSV（列を自動検出）', 'CSV bất kỳ (tự động nhận diện cột)', 'Any CSV file (auto-detect columns)'),
    null, 'global', null, '#6366F1', 'GC', 'generic_csv', true, false, 8),
  ('manual', public._seed_t('provider.manual.name', '手動入力', 'Nhập tay', 'Manual'),
    public._seed_t('provider.manual.description', '手動で取引を入力', 'Nhập giao dịch thủ công', 'Manually entered transactions'),
    'cash', 'global', null, '#0d9159', 'MT', null, false, false, 9),
  ('ai_scan', public._seed_t('provider.ai_scan.name', 'AIスキャン', 'Quét AI', 'AI Scan'),
    public._seed_t('provider.ai_scan.description', 'AI レシートスキャン', 'Quét hóa đơn bằng AI', 'AI receipt scan'),
    null, 'global', null, '#3b82f6', 'AI', null, false, false, 10)
on conflict (code) do nothing;

-- Roles & permissions --------------------------------------------------------
insert into public.roles (code, name_key, description_key, rank, is_assignable, sort_order) values
  ('OWNER', public._seed_t('role.OWNER.name', 'オーナー', 'Chủ sổ', 'Owner'),
    public._seed_t('role.OWNER.description', 'すべての権限。元帳の削除と所有権の移譲ができます', 'Toàn quyền, có thể xoá sổ và chuyển quyền sở hữu', 'Full control, can delete the ledger and transfer ownership'), 400, false, 1),
  ('ADMIN', public._seed_t('role.ADMIN.name', '管理者', 'Quản trị viên', 'Admin'),
    public._seed_t('role.ADMIN.description', 'メンバーと設定を管理できます', 'Quản lý thành viên và cài đặt', 'Manages members and settings'), 300, true, 2),
  ('ACCOUNTANT', public._seed_t('role.ACCOUNTANT.name', '会計士', 'Kế toán', 'Accountant'),
    public._seed_t('role.ACCOUNTANT.description', '取引とレポートを管理できます', 'Quản lý giao dịch và báo cáo', 'Manages transactions and reports'), 250, true, 3),
  ('MEMBER', public._seed_t('role.MEMBER.name', 'メンバー', 'Thành viên', 'Member'),
    public._seed_t('role.MEMBER.description', '取引の追加・編集ができます', 'Thêm và sửa giao dịch', 'Adds and edits transactions'), 200, true, 4),
  ('AUDITOR', public._seed_t('role.AUDITOR.name', '監査人', 'Kiểm toán', 'Auditor'),
    public._seed_t('role.AUDITOR.description', 'すべての財務データと操作履歴を閲覧できます', 'Xem toàn bộ dữ liệu và nhật ký', 'Reads all financial data and the activity log'), 150, true, 5),
  ('VIEWER', public._seed_t('role.VIEWER.name', '閲覧者', 'Người xem', 'Viewer'),
    public._seed_t('role.VIEWER.description', 'ダッシュボードとレポートの閲覧のみ', 'Chỉ xem tổng quan và báo cáo', 'Read-only access to dashboards and reports'), 100, true, 6)
on conflict (code) do nothing;

insert into public.permissions (code, resource, action) values
  ('ledger.read', 'ledger', 'read'), ('ledger.update', 'ledger', 'update'), ('ledger.delete', 'ledger', 'delete'),
  ('member.invite', 'member', 'invite'), ('member.update', 'member', 'update'), ('member.remove', 'member', 'remove'),
  ('account.create', 'account', 'create'), ('account.update', 'account', 'update'), ('account.delete', 'account', 'delete'),
  ('category.create', 'category', 'create'), ('category.update', 'category', 'update'), ('category.delete', 'category', 'delete'),
  ('budget.create', 'budget', 'create'), ('budget.update', 'budget', 'update'), ('budget.delete', 'budget', 'delete'),
  ('recurring.create', 'recurring', 'create'), ('recurring.update', 'recurring', 'update'), ('recurring.delete', 'recurring', 'delete'),
  ('transaction.create', 'transaction', 'create'), ('transaction.update', 'transaction', 'update'),
  ('transaction.delete', 'transaction', 'delete'), ('transaction.reconcile', 'transaction', 'reconcile'),
  ('import.create', 'import', 'create'),
  ('report.read', 'report', 'read'), ('report.export', 'report', 'export'),
  ('audit.read', 'audit', 'read'),
  ('translation.override', 'translation', 'override')
on conflict (code) do nothing;

insert into public.role_permissions (role_code, permission_code)
select r.role_code, p.code
from (values
  ('OWNER', '%'),
  ('ADMIN', 'ledger.read'), ('ADMIN', 'ledger.update'), ('ADMIN', 'member.%'), ('ADMIN', 'account.%'),
  ('ADMIN', 'category.%'), ('ADMIN', 'budget.%'), ('ADMIN', 'recurring.%'), ('ADMIN', 'transaction.%'),
  ('ADMIN', 'import.%'), ('ADMIN', 'report.%'), ('ADMIN', 'audit.read'), ('ADMIN', 'translation.override'),
  ('ACCOUNTANT', 'ledger.read'), ('ACCOUNTANT', 'account.%'), ('ACCOUNTANT', 'category.%'), ('ACCOUNTANT', 'budget.%'),
  ('ACCOUNTANT', 'recurring.%'), ('ACCOUNTANT', 'transaction.%'), ('ACCOUNTANT', 'import.%'),
  ('ACCOUNTANT', 'report.%'), ('ACCOUNTANT', 'audit.read'),
  ('MEMBER', 'ledger.read'), ('MEMBER', 'account.%'), ('MEMBER', 'category.%'), ('MEMBER', 'budget.%'),
  ('MEMBER', 'recurring.%'), ('MEMBER', 'transaction.create'), ('MEMBER', 'transaction.update'),
  ('MEMBER', 'import.create'), ('MEMBER', 'report.%'),
  ('AUDITOR', 'ledger.read'), ('AUDITOR', 'report.read'), ('AUDITOR', 'report.export'), ('AUDITOR', 'audit.read'),
  ('VIEWER', 'ledger.read'), ('VIEWER', 'report.read')
) as r(role_code, pattern)
join public.permissions p on p.code like r.pattern
on conflict do nothing;

-- Category templates -----------------------------------------------------------
insert into public.category_templates (code, name_key, description_key, icon, sort_order) values
  ('default_personal', public._seed_t('template.default_personal.name', '基本（個人・家族）', 'Cơ bản (cá nhân, gia đình)', 'Basic (personal & family)'),
    public._seed_t('template.default_personal.description', '食費・交通・光熱費など日常の支出', 'Chi tiêu hằng ngày: ăn uống, đi lại, điện nước…', 'Everyday spending: food, transport, utilities…'), 'wallet', 1),
  ('household', public._seed_t('template.household.name', '家族', 'Hộ gia đình', 'Household'),
    public._seed_t('template.household.description', '日用品・育児・ペット・保険', 'Đồ dùng, con cái, thú cưng, bảo hiểm', 'Daily goods, childcare, pets, insurance'), 'house', 2),
  ('travel', public._seed_t('template.travel.name', '旅行', 'Du lịch', 'Travel'),
    public._seed_t('template.travel.description', '移動・宿泊・観光・お土産', 'Di chuyển, lưu trú, tham quan, quà', 'Transport, lodging, sightseeing, souvenirs'), 'plane', 3),
  ('wedding', public._seed_t('template.wedding.name', '結婚式', 'Đám cưới', 'Wedding'),
    public._seed_t('template.wedding.description', '会場・衣装・指輪・引き出物', 'Địa điểm, trang phục, nhẫn, quà cảm ơn', 'Venue, attire, rings, gifts'), 'heart', 4),
  ('business', public._seed_t('template.business.name', 'ビジネス', 'Kinh doanh', 'Business'),
    public._seed_t('template.business.description', '売上と主な経費科目', 'Doanh thu và các khoản chi phí chính', 'Revenue and common expense accounts'), 'briefcase', 5)
on conflict (code) do nothing;

insert into public.category_template_items (template_code, slug, name_key, category_type, icon, color, is_system, sort_order) values
  ('default_personal', 'food', public._seed_t('category.default.food', '食費', 'Ăn uống', 'Food'), 'expense', 'utensils', '#10b981', false, 1),
  ('default_personal', 'transport', public._seed_t('category.default.transport', '交通', 'Đi lại', 'Transport'), 'expense', 'train-front', '#3b82f6', false, 2),
  ('default_personal', 'shopping', public._seed_t('category.default.shopping', '買い物', 'Mua sắm', 'Shopping'), 'expense', 'shopping-bag', '#f59e0b', false, 3),
  ('default_personal', 'entertainment', public._seed_t('category.default.entertainment', '娯楽', 'Giải trí', 'Entertainment'), 'expense', 'gamepad-2', '#a855f7', false, 4),
  ('default_personal', 'health', public._seed_t('category.default.health', '医療・健康', 'Sức khỏe', 'Health'), 'expense', 'heart-pulse', '#ec4899', false, 5),
  ('default_personal', 'utilities', public._seed_t('category.default.utilities', '光熱費', 'Điện nước', 'Utilities'), 'expense', 'zap', '#14b8a6', false, 6),
  ('default_personal', 'housing', public._seed_t('category.default.housing', '住居', 'Nhà ở', 'Housing'), 'expense', 'house', '#6366f1', false, 7),
  ('default_personal', 'communication', public._seed_t('category.default.communication', '通信', 'Viễn thông', 'Phone & internet'), 'expense', 'smartphone', '#0ea5e9', false, 8),
  ('default_personal', 'other-expense', public._seed_t('category.default.other_expense', 'その他', 'Khác', 'Other'), 'expense', 'package', '#94a3b8', false, 9),
  ('default_personal', 'salary', public._seed_t('category.default.salary', '給与', 'Lương', 'Salary'), 'income', 'briefcase', '#059669', false, 20),
  ('default_personal', 'other-income', public._seed_t('category.default.other_income', 'その他収入', 'Thu nhập khác', 'Other income'), 'income', 'piggy-bank', '#34d399', false, 21),
  ('default_personal', 'transfer', public._seed_t('category.default.transfer', '振替', 'Chuyển khoản', 'Transfer'), 'transfer', 'arrow-left-right', '#64748b', true, 30),
  ('household', 'household-daily-goods', public._seed_t('category.household.daily_goods', '日用品', 'Đồ dùng hằng ngày', 'Daily goods'), 'expense', 'spray-can', '#f97316', false, 1),
  ('household', 'household-childcare', public._seed_t('category.household.childcare', '育児', 'Con cái', 'Childcare'), 'expense', 'baby', '#ec4899', false, 2),
  ('household', 'household-pets', public._seed_t('category.household.pets', 'ペット', 'Thú cưng', 'Pets'), 'expense', 'paw-print', '#a855f7', false, 3),
  ('household', 'household-insurance', public._seed_t('category.household.insurance', '保険', 'Bảo hiểm', 'Insurance'), 'expense', 'shield', '#3b82f6', false, 4),
  ('travel', 'travel-transport', public._seed_t('category.travel.transport', '移動', 'Di chuyển', 'Getting there'), 'expense', 'plane', '#3b82f6', false, 1),
  ('travel', 'travel-lodging', public._seed_t('category.travel.lodging', '宿泊', 'Lưu trú', 'Lodging'), 'expense', 'bed', '#6366f1', false, 2),
  ('travel', 'travel-sightseeing', public._seed_t('category.travel.sightseeing', '観光', 'Tham quan', 'Sightseeing'), 'expense', 'camera', '#f59e0b', false, 3),
  ('travel', 'travel-food', public._seed_t('category.travel.food', '旅行の食事', 'Ăn uống khi du lịch', 'Meals while travelling'), 'expense', 'utensils', '#10b981', false, 4),
  ('travel', 'travel-souvenirs', public._seed_t('category.travel.souvenirs', 'お土産', 'Quà lưu niệm', 'Souvenirs'), 'expense', 'gift', '#ec4899', false, 5),
  ('wedding', 'wedding-venue', public._seed_t('category.wedding.venue', '会場', 'Địa điểm', 'Venue'), 'expense', 'building', '#6366f1', false, 1),
  ('wedding', 'wedding-attire', public._seed_t('category.wedding.attire', '衣装', 'Trang phục', 'Attire'), 'expense', 'shirt', '#ec4899', false, 2),
  ('wedding', 'wedding-rings', public._seed_t('category.wedding.rings', '指輪', 'Nhẫn cưới', 'Rings'), 'expense', 'gem', '#f59e0b', false, 3),
  ('wedding', 'wedding-gifts', public._seed_t('category.wedding.gifts', '引き出物', 'Quà cảm ơn', 'Guest gifts'), 'expense', 'gift', '#10b981', false, 4),
  ('business', 'sales', public._seed_t('category.business.sales', '売上', 'Doanh thu', 'Sales'), 'income', 'trending-up', '#059669', false, 1),
  ('business', 'supplies', public._seed_t('category.business.supplies', '消耗品費', 'Vật tư tiêu hao', 'Supplies'), 'expense', 'package', '#f59e0b', false, 2),
  ('business', 'travel-expenses', public._seed_t('category.business.travel', '旅費交通費', 'Chi phí đi lại', 'Travel expenses'), 'expense', 'train-front', '#3b82f6', false, 3),
  ('business', 'communication-expenses', public._seed_t('category.business.communication', '通信費', 'Chi phí viễn thông', 'Communication'), 'expense', 'smartphone', '#0ea5e9', false, 4),
  ('business', 'rent', public._seed_t('category.business.rent', '地代家賃', 'Tiền thuê', 'Rent'), 'expense', 'building', '#6366f1', false, 5),
  ('business', 'outsourcing', public._seed_t('category.business.outsourcing', '外注費', 'Thuê ngoài', 'Outsourcing'), 'expense', 'users', '#a855f7', false, 6),
  ('business', 'client-entertainment', public._seed_t('category.business.entertainment', '接待交際費', 'Tiếp khách', 'Client entertainment'), 'expense', 'wine', '#ec4899', false, 7),
  ('business', 'transfer', 'category.default.transfer', 'transfer', 'arrow-left-right', '#64748b', true, 30)
on conflict (template_code, slug) do nothing;

-- Sub-categories of food in the default template.
insert into public.category_template_items (template_code, parent_item_id, slug, name_key, category_type, icon, color, sort_order)
select 'default_personal', p.id, v.slug, public._seed_t(v.key, v.ja, v.vi, v.en), 'expense', v.icon, '#10b981', v.ord
from public.category_template_items p
cross join (values
  ('groceries', 'category.default.groceries', '食料品', 'Siêu thị', 'Groceries', 'shopping-cart', 1),
  ('eating-out', 'category.default.eating_out', '外食', 'Ăn ngoài', 'Eating out', 'utensils-crossed', 2),
  ('cafe', 'category.default.cafe', 'カフェ', 'Cà phê', 'Cafe', 'coffee', 3)
) as v(slug, key, ja, vi, en, icon, ord)
where p.template_code = 'default_personal' and p.slug = 'food'
on conflict (template_code, slug) do nothing;

insert into public.ledger_types (code, name_key, description_key, icon, default_fiscal_start_month, default_template_code, sort_order) values
  ('personal', public._seed_t('ledger_type.personal.name', '個人', 'Cá nhân', 'Personal'),
    public._seed_t('ledger_type.personal.description', '自分のお金を管理', 'Quản lý tiền của riêng bạn', 'Track your own money'), 'user', 1, 'default_personal', 1),
  ('family', public._seed_t('ledger_type.family.name', '家族', 'Gia đình', 'Family'),
    public._seed_t('ledger_type.family.description', '家族で家計を共有', 'Chia sẻ chi tiêu cả nhà', 'Share a household budget'), 'users', 1, 'default_personal', 2),
  ('business', public._seed_t('ledger_type.business.name', 'ビジネス', 'Doanh nghiệp', 'Business'),
    public._seed_t('ledger_type.business.description', '会社の経費と売上', 'Chi phí và doanh thu công ty', 'Company expenses and revenue'), 'building-2', 4, 'business', 3),
  ('freelance', public._seed_t('ledger_type.freelance.name', 'フリーランス', 'Freelance', 'Freelance'),
    public._seed_t('ledger_type.freelance.description', '個人事業の収支', 'Thu chi kinh doanh cá nhân', 'Self-employed income and costs'), 'briefcase', 1, 'business', 4)
on conflict (code) do nothing;

-- Notifications ---------------------------------------------------------------
insert into public.notification_categories (code, name_key, is_mandatory, sort_order) values
  ('security', public._seed_t('notification_category.security.name', 'セキュリティ', 'Bảo mật', 'Security'), true, 1),
  ('transactions', public._seed_t('notification_category.transactions.name', '取引', 'Giao dịch', 'Transactions'), false, 2),
  ('budget', public._seed_t('notification_category.budget.name', '予算', 'Ngân sách', 'Budget'), false, 3),
  ('import', public._seed_t('notification_category.import.name', 'インポート', 'Nhập dữ liệu', 'Import'), false, 4),
  ('recurring', public._seed_t('notification_category.recurring.name', '定期支出', 'Định kỳ', 'Recurring'), false, 5),
  ('report', public._seed_t('notification_category.report.name', 'レポート', 'Báo cáo', 'Reports'), false, 6),
  ('insight', public._seed_t('notification_category.insight.name', 'インサイト', 'Phân tích', 'Insights'), false, 7),
  ('members', public._seed_t('notification_category.members.name', 'メンバー', 'Thành viên', 'Members'), false, 8),
  ('billing', public._seed_t('notification_category.billing.name', '請求', 'Thanh toán', 'Billing'), false, 9),
  ('product_updates', public._seed_t('notification_category.product_updates.name', 'お知らせ', 'Cập nhật sản phẩm', 'Product updates'), false, 10)
on conflict (code) do nothing;

insert into public.notification_channels (code, name_key, icon, is_available, sort_order) values
  ('in_app', public._seed_t('notification_channel.in_app.name', 'アプリ内', 'Trong ứng dụng', 'In-app'), 'bell', true, 1),
  ('email', public._seed_t('notification_channel.email.name', 'メール', 'Email', 'Email'), 'mail', true, 2),
  ('push', public._seed_t('notification_channel.push.name', 'プッシュ', 'Thông báo đẩy', 'Push'), 'smartphone', false, 3),
  ('sms', public._seed_t('notification_channel.sms.name', 'SMS', 'SMS', 'SMS'), 'message-square', false, 4)
on conflict (code) do nothing;

insert into public.notification_defaults (category_code, channel_code, is_enabled)
select c.code, ch.code,
  case
    when ch.code = 'in_app' then true
    when ch.code = 'email' then c.code in ('security', 'budget', 'members')
    else false
  end
from public.notification_categories c cross join public.notification_channels ch
on conflict do nothing;

insert into public.notification_types (code, category_code, title_key, body_key, icon, severity) values
  ('budget_warning', 'budget',
    public._seed_t('notification.budget_warning.title', '予算アラート: {{category}}', 'Cảnh báo ngân sách: {{category}}', 'Budget alert: {{category}}', 'category'),
    public._seed_t('notification.budget_warning.body', '{{category}} が今月の予算の {{pct}}% に達しました', '{{category}} đã dùng {{pct}}% ngân sách tháng này', '{{category}} has reached {{pct}}% of this month''s budget', 'category,pct'),
    'alert-triangle', 'warning'),
  ('budget_exceeded', 'budget',
    public._seed_t('notification.budget_exceeded.title', '予算超過: {{category}}', 'Vượt ngân sách: {{category}}', 'Over budget: {{category}}', 'category'),
    public._seed_t('notification.budget_exceeded.body', '{{category}} が今月の予算を超えました（{{pct}}%）', '{{category}} đã vượt ngân sách tháng này ({{pct}}%)', '{{category}} is over this month''s budget ({{pct}}%)', 'category,pct'),
    'alert-octagon', 'danger'),
  ('import_done', 'import',
    public._seed_t('notification.import_done.title', 'インポート完了', 'Nhập dữ liệu xong', 'Import complete'),
    public._seed_t('notification.import_done.body', '{{file}} から {{count}} 件を追加しました（重複 {{duplicates}} 件をスキップ）', 'Đã thêm {{count}} giao dịch từ {{file}} (bỏ qua {{duplicates}} trùng)', 'Added {{count}} transactions from {{file}} ({{duplicates}} duplicates skipped)', 'count,duplicates,file'),
    'check-circle', 'success'),
  ('report_ready', 'report',
    public._seed_t('notification.report_ready.title', '{{month}} のレポートができました', 'Báo cáo {{month}} đã sẵn sàng', 'Your {{month}} report is ready', 'month'),
    public._seed_t('notification.report_ready.body', '月次レポートを確認しましょう', 'Xem báo cáo tháng của bạn', 'Take a look at your monthly report'),
    'file-text', 'info'),
  ('unusual_expense', 'insight',
    public._seed_t('notification.unusual_expense.title', 'いつもと違う支出', 'Chi tiêu bất thường', 'Unusual expense detected'),
    public._seed_t('notification.unusual_expense.body', '{{description}}（{{amount}}）は普段より高額です', '{{description}} ({{amount}}) cao hơn thường lệ', '{{description}} ({{amount}}) is higher than usual', 'description,amount'),
    'zap', 'warning'),
  ('recurring_due', 'recurring',
    public._seed_t('notification.recurring_due.title', '定期支出: {{name}}', 'Định kỳ: {{name}}', 'Recurring: {{name}}', 'name'),
    public._seed_t('notification.recurring_due.body', '{{date}} に記帳されます', 'Sẽ được ghi vào {{date}}', 'Will be recorded on {{date}}', 'date'),
    'refresh-cw', 'info'),
  ('recurring_pending', 'recurring',
    public._seed_t('notification.recurring_pending.title', '確認待ち: {{name}}', 'Chờ xác nhận: {{name}}', 'Needs confirmation: {{name}}', 'name'),
    public._seed_t('notification.recurring_pending.body', '{{date}} の定期取引を確認してください', 'Hãy xác nhận giao dịch định kỳ ngày {{date}}', 'Please confirm the recurring transaction for {{date}}', 'date'),
    'clock', 'warning'),
  ('invitation_received', 'members',
    public._seed_t('notification.invitation_received.title', '{{ledger}} への招待', 'Lời mời vào {{ledger}}', 'Invitation to {{ledger}}', 'ledger'),
    public._seed_t('notification.invitation_received.body', '{{inviter}} さんがあなたを招待しました', '{{inviter}} đã mời bạn', '{{inviter}} invited you', 'inviter'),
    'user-plus', 'info'),
  ('member_joined', 'members',
    public._seed_t('notification.member_joined.title', 'メンバーが参加しました', 'Có thành viên mới', 'A member joined'),
    public._seed_t('notification.member_joined.body', '{{name}} さんが元帳に参加しました', '{{name}} đã tham gia sổ', '{{name}} joined the ledger', 'name'),
    'users', 'success'),
  ('new_login', 'security',
    public._seed_t('notification.new_login.title', '新しいログイン', 'Đăng nhập mới', 'New sign-in'),
    public._seed_t('notification.new_login.body', '{{device}} から新しくログインがありました', 'Có lượt đăng nhập mới từ {{device}}', 'New sign-in from {{device}}', 'device'),
    'shield-alert', 'warning')
on conflict (code) do nothing;

drop function public._seed_t(varchar, text, text, text, varchar);
