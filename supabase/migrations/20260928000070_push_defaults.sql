-- Notifications reach the phone's lock screen by default once a device has push
-- turned on (Settings → Notifications → "Push on this device"). Before, only
-- approvals were on, so turning push on showed almost nothing. Devices without
-- push are unaffected, and anyone's own per-category choice still wins.
update public.notification_defaults set is_enabled = true
 where channel_code = 'push'
   and category_code in ('security', 'transactions', 'budget', 'import', 'recurring', 'members', 'approvals');
