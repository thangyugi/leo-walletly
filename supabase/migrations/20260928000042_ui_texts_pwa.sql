-- Texts for the PWA: update prompt, offline banner and page, install entry
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('pwa.updateReady', 'pwa', false),
  ('pwa.updateAction', 'pwa', false),
  ('pwa.offline', 'pwa', false),
  ('pwa.backOnline', 'pwa', false),
  ('pwa.install', 'pwa', false),
  ('pwa.installSub', 'pwa', false),
  ('pwa.installed', 'pwa', false),
  ('pwa.iosTitle', 'pwa', false),
  ('pwa.iosStep1', 'pwa', false),
  ('pwa.iosStep2', 'pwa', false),
  ('pwa.iosStep3', 'pwa', false),
  ('pwa.iosNote', 'pwa', false),
  ('pwa.offlineTitle', 'pwa', false),
  ('pwa.offlineBody', 'pwa', false),
  ('pwa.retry', 'pwa', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('pwa.updateReady', 'ja', '新しいバージョンがあります。'), ('pwa.updateReady', 'vi', 'Đã có phiên bản mới của Walletly.'), ('pwa.updateReady', 'en', 'A new version of Walletly is available.'),
  ('pwa.updateAction', 'ja', '更新'), ('pwa.updateAction', 'vi', 'Cập nhật'), ('pwa.updateAction', 'en', 'Update'),
  ('pwa.offline', 'ja', 'オフラインです。データが最新でない可能性があり、変更は保存できません。'), ('pwa.offline', 'vi', 'Bạn đang ngoại tuyến — số liệu có thể chưa mới nhất và chưa lưu được thay đổi.'), ('pwa.offline', 'en', 'You are offline — figures may be out of date and changes cannot be saved.'),
  ('pwa.backOnline', 'ja', 'オンラインに戻りました。'), ('pwa.backOnline', 'vi', 'Đã kết nối mạng trở lại.'), ('pwa.backOnline', 'en', 'Back online.'),
  ('pwa.install', 'ja', 'アプリをインストール'), ('pwa.install', 'vi', 'Cài đặt ứng dụng'), ('pwa.install', 'en', 'Install the app'),
  ('pwa.installSub', 'ja', 'ホーム画面からすぐ開ける全画面アプリ'), ('pwa.installSub', 'vi', 'Mở nhanh từ màn hình chính, hiển thị toàn màn hình'), ('pwa.installSub', 'en', 'Opens from your home screen, full screen'),
  ('pwa.installed', 'ja', 'インストールしました'), ('pwa.installed', 'vi', 'Đã cài đặt ứng dụng'), ('pwa.installed', 'en', 'App installed'),
  ('pwa.iosTitle', 'ja', 'iPhone / iPad にインストール'), ('pwa.iosTitle', 'vi', 'Cài Walletly lên iPhone / iPad'), ('pwa.iosTitle', 'en', 'Install Walletly on iPhone / iPad'),
  ('pwa.iosStep1', 'ja', 'Safari の下部にある共有ボタン（四角と矢印）を押します。'), ('pwa.iosStep1', 'vi', 'Bấm nút Chia sẻ (ô vuông có mũi tên lên) ở thanh dưới của Safari.'), ('pwa.iosStep1', 'en', 'Tap the Share button (square with an arrow) in Safari.'),
  ('pwa.iosStep2', 'ja', '「ホーム画面に追加」を選びます。'), ('pwa.iosStep2', 'vi', 'Chọn "Thêm vào MH chính".'), ('pwa.iosStep2', 'en', 'Choose "Add to Home Screen".'),
  ('pwa.iosStep3', 'ja', '「追加」を押すと、ホーム画面に Walletly が表示されます。'), ('pwa.iosStep3', 'vi', 'Bấm "Thêm" — biểu tượng Walletly sẽ xuất hiện trên màn hình chính.'), ('pwa.iosStep3', 'en', 'Tap "Add" — Walletly appears on your home screen.'),
  ('pwa.iosNote', 'ja', 'Safari で開いている場合のみ追加できます。'), ('pwa.iosNote', 'vi', 'Chỉ thêm được khi đang mở bằng Safari.'), ('pwa.iosNote', 'en', 'Only available when opened in Safari.'),
  ('pwa.offlineTitle', 'ja', 'インターネットに接続されていません'), ('pwa.offlineTitle', 'vi', 'Không có kết nối mạng'), ('pwa.offlineTitle', 'en', 'No internet connection'),
  ('pwa.offlineBody', 'ja', 'Walletly はデータの読み込みと保存にネットワークを使います。Wi-Fi またはモバイルデータを確認してから、もう一度お試しください。'), ('pwa.offlineBody', 'vi', 'Walletly cần mạng để tải và lưu số liệu. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.'), ('pwa.offlineBody', 'en', 'Walletly needs the network to load and save your figures. Check Wi-Fi or mobile data and try again.'),
  ('pwa.retry', 'ja', '再試行'), ('pwa.retry', 'vi', 'Thử lại'), ('pwa.retry', 'en', 'Try again')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
