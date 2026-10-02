-- Texts for login / sign-up / password reset errors and the reset page
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('login.errNoAccount', 'login', false),
  ('login.errWrongPassword', 'login', false),
  ('login.errNotConfirmed', 'login', false),
  ('login.errAlreadyRegistered', 'login', false),
  ('login.errSessionGone', 'login', false),
  ('login.errRateLimit', 'login', false),
  ('login.errWeakPassword', 'login', false),
  ('login.signupWithEmail', 'login', false),
  ('login.resetSentTo', 'login', false),
  ('login.resetTitle', 'login', false),
  ('login.resetSub', 'login', false),
  ('login.newPassword', 'login', false),
  ('login.confirmPassword', 'login', false),
  ('login.mismatch', 'login', false),
  ('login.resetSubmit', 'login', false),
  ('login.resetDone', 'login', false),
  ('login.resetLinkInvalid', 'login', false),
  ('login.resetWaiting', 'login', false),
  ('login.backToLogin', 'login', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('login.errNoAccount', 'ja', 'このメールアドレスのアカウントは見つかりません。入力を確認するか、新しく登録してください。'), ('login.errNoAccount', 'vi', 'Chưa có tài khoản nào khớp với email này. Hãy kiểm tra lại email hoặc đăng ký tài khoản mới.'), ('login.errNoAccount', 'en', 'No account matches this email. Check the address or create a new account.'),
  ('login.errWrongPassword', 'ja', 'パスワードが正しくありません。もう一度入力するか「パスワードをお忘れですか？」を押してください。'), ('login.errWrongPassword', 'vi', 'Mật khẩu không đúng. Hãy nhập lại hoặc bấm "Quên mật khẩu?".'), ('login.errWrongPassword', 'en', 'Wrong password. Try again or press "Forgot password?".'),
  ('login.errNotConfirmed', 'ja', 'メールアドレスがまだ確認されていません。メール内のリンクを開くか、確認メールを再送してください。'), ('login.errNotConfirmed', 'vi', 'Email chưa được xác nhận. Hãy mở link trong email, hoặc bấm "Gửi lại email xác nhận".'), ('login.errNotConfirmed', 'en', 'This email is not confirmed yet. Open the link in the email, or resend it.'),
  ('login.errAlreadyRegistered', 'ja', 'このメールアドレスは登録済みです。ログインしてください。'), ('login.errAlreadyRegistered', 'vi', 'Email này đã được đăng ký. Hãy đăng nhập.'), ('login.errAlreadyRegistered', 'en', 'This email is already registered. Please sign in.'),
  ('login.errSessionGone', 'ja', 'アカウントが存在しないか、ログインの有効期限が切れました。もう一度ログインしてください。'), ('login.errSessionGone', 'vi', 'Tài khoản không còn tồn tại hoặc phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'), ('login.errSessionGone', 'en', 'The account no longer exists or the session expired. Please sign in again.'),
  ('login.errRateLimit', 'ja', '操作が多すぎます。しばらく待ってからもう一度お試しください。'), ('login.errRateLimit', 'vi', 'Bạn thao tác quá nhiều lần. Hãy đợi một lát rồi thử lại.'), ('login.errRateLimit', 'en', 'Too many attempts. Wait a moment and try again.'),
  ('login.errWeakPassword', 'ja', 'パスワードは6文字以上にしてください。'), ('login.errWeakPassword', 'vi', 'Mật khẩu cần ít nhất 6 ký tự.'), ('login.errWeakPassword', 'en', 'The password needs at least 6 characters.'),
  ('login.signupWithEmail', 'ja', 'このメールアドレスで登録'), ('login.signupWithEmail', 'vi', 'Đăng ký với email này'), ('login.signupWithEmail', 'en', 'Sign up with this email'),
  ('login.resetSentTo', 'ja', '{{email}} にパスワード再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。'), ('login.resetSentTo', 'vi', 'Đã gửi email đặt lại mật khẩu tới {{email}}. Mở link trong email để đặt mật khẩu mới.'), ('login.resetSentTo', 'en', 'Sent a password reset email to {{email}}. Open the link in it to set a new password.'),
  ('login.resetTitle', 'ja', 'パスワードの再設定'), ('login.resetTitle', 'vi', 'Đặt lại mật khẩu'), ('login.resetTitle', 'en', 'Reset password'),
  ('login.resetSub', 'ja', '{{email}} の新しいパスワードを入力してください'), ('login.resetSub', 'vi', 'Nhập mật khẩu mới cho {{email}}'), ('login.resetSub', 'en', 'Enter a new password for {{email}}'),
  ('login.newPassword', 'ja', '新しいパスワード'), ('login.newPassword', 'vi', 'Mật khẩu mới'), ('login.newPassword', 'en', 'New password'),
  ('login.confirmPassword', 'ja', '新しいパスワード（確認）'), ('login.confirmPassword', 'vi', 'Nhập lại mật khẩu mới'), ('login.confirmPassword', 'en', 'Confirm new password'),
  ('login.mismatch', 'ja', '2つのパスワードが一致しません。'), ('login.mismatch', 'vi', 'Hai mật khẩu không khớp.'), ('login.mismatch', 'en', 'The passwords do not match.'),
  ('login.resetSubmit', 'ja', '新しいパスワードを保存'), ('login.resetSubmit', 'vi', 'Lưu mật khẩu mới'), ('login.resetSubmit', 'en', 'Save new password'),
  ('login.resetDone', 'ja', 'パスワードを変更しました。アプリを開いています…'), ('login.resetDone', 'vi', 'Đã đổi mật khẩu. Đang vào ứng dụng…'), ('login.resetDone', 'en', 'Password changed. Opening the app…'),
  ('login.resetLinkInvalid', 'ja', 'パスワード再設定リンクの有効期限が切れたか、すでに使用されています。もう一度リクエストしてください。'), ('login.resetLinkInvalid', 'vi', 'Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu link mới.'), ('login.resetLinkInvalid', 'en', 'The reset link has expired or was already used. Please request a new one.'),
  ('login.resetWaiting', 'ja', 'リンクを確認しています…'), ('login.resetWaiting', 'vi', 'Đang kiểm tra link…'), ('login.resetWaiting', 'en', 'Checking the link…'),
  ('login.backToLogin', 'ja', 'ログインに戻る'), ('login.backToLogin', 'vi', 'Quay lại đăng nhập'), ('login.backToLogin', 'en', 'Back to sign in')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();

insert into public.translation_keys (key, namespace, is_user_editable) values
  ('login.errEmailSend', 'login', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('login.errEmailSend', 'ja', 'メールを送信できませんでした。しばらくしてからもう一度お試しください。'), ('login.errEmailSend', 'vi', 'Không gửi được email. Hãy thử lại sau ít phút.'), ('login.errEmailSend', 'en', 'Could not send the email. Please try again in a few minutes.')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();

insert into public.translation_keys (key, namespace, is_user_editable) values
  ('login.errSamePassword', 'login', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('login.errSamePassword', 'ja', '以前と同じパスワードは使えません。別のパスワードを入力してください。'), ('login.errSamePassword', 'vi', 'Mật khẩu mới phải khác mật khẩu cũ.'), ('login.errSamePassword', 'en', 'The new password must be different from the old one.')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
