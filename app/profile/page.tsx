'use client'

import { User, Mail, Globe, Lock, Bell, CreditCard, Camera, ChevronRight, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { t, lang } = useTranslation()
  const userEmail   = user?.email ?? 'user@example.com'
  const userInitial = userEmail[0]?.toUpperCase() ?? 'L'
  
  const sections = [
    {
      icon: Mail,
      label: lang === 'vi' ? 'Thông tin cá nhân' : (lang === 'ja' ? '個人情報' : 'Personal Information'),
      description: lang === 'vi' ? 'Tên, email, số điện thoại' : (lang === 'ja' ? '名前、メールアドレス、電話番号' : 'Name, email, phone number'),
      path: '/settings/profile'
    },
    {
      icon: Lock,
      label: t.settings.sidebar.security,
      description: lang === 'vi' ? 'Mật khẩu, xác thực 2 lớp, phiên hoạt động' : (lang === 'ja' ? 'パスワード、2要素認証、アクティブなセッション' : 'Password, two-factor authentication, active sessions'),
    },
    {
      icon: Bell,
      label: t.settings.sidebar.notifications,
      description: lang === 'vi' ? 'Cảnh báo ngân sách, tóm tắt tuần, thông báo nhập liệu' : (lang === 'ja' ? '予算アラート、週次サマリー、インポート通知' : 'Budget alerts, weekly summaries, import notifications'),
    },
    {
      icon: Globe,
      label: lang === 'vi' ? 'Vùng & Tiền tệ' : (lang === 'ja' ? '地域と言語' : 'Locale & Currency'),
      description: lang === 'vi' ? 'Ngôn ngữ, múi giờ, tiền tệ hiển thị' : (lang === 'ja' ? '言語、タイムゾーン、デフォルトの表示通貨' : 'Language, timezone, default display currency'),
    },
    {
      icon: CreditCard,
      label: lang === 'vi' ? 'Tài khoản liên kết' : (lang === 'ja' ? '連携アカウント' : 'Linked Accounts'),
      description: lang === 'vi' ? 'Kết nối ngân hàng, nguồn nhập CSV, tích hợp' : (lang === 'ja' ? '銀行接続、CSVインポートソース、統合' : 'Bank connections, CSV import sources, integrations'),
    },
  ]

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(lang === 'ja' ? 'ja-JP' : (lang === 'vi' ? 'vi-VN' : 'en-US'), { month: 'long', year: 'numeric' })
    : (lang === 'vi' ? 'Tháng 1 năm 2026' : (lang === 'ja' ? '2026年1月' : 'January 2026'))

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={t.settings.sidebar.profile}
        subtitle={lang === 'vi' ? 'Quản lý tài khoản và tùy chọn của bạn' : (lang === 'ja' ? 'アカウントと設定を管理します' : 'Manage your account and preferences')}
      />

      {/* Info banner */}
      <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] px-4 py-3 flex items-center gap-3">
        <User className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
        <p className="text-sm text-[var(--color-brand-700)] font-medium">
          {lang === 'vi' 
            ? 'Hiện tại bạn đã có thể cập nhật Hồ sơ cá nhân. Các mục cài đặt khác đang được hoàn thiện.' 
            : (lang === 'ja' ? '現在、個人情報の更新が可能です。その他の設定は現在開発中です。' : 'You can now update your Personal Information. Other settings are currently under development.')}
        </p>
      </div>

      {/* Avatar + basic info */}
      <div className="card-base p-6 flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white text-2xl font-bold select-none">
            {userInitial}
          </div>
          <button
            disabled
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--color-surface-default)] border border-[var(--color-border-default)] flex items-center justify-center cursor-not-allowed opacity-50"
          >
            <Camera className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">{userEmail}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <User className="w-3 h-3" />
              {lang === 'vi' ? 'Không gian cá nhân' : (lang === 'ja' ? '個人ワークスペース' : 'Personal workspace')}
            </span>
            <span className="text-[var(--color-border-default)]">·</span>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {lang === 'vi' ? `Thành viên từ ${joinDate}` : (lang === 'ja' ? `${joinDate}からのメンバー` : `Member since ${joinDate}`)}
            </span>
          </div>
          <Link
            href="/settings/profile"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-interactive-primary)] hover:text-[var(--color-interactive-primary-hover)] transition-colors"
          >
            {lang === 'vi' ? 'Chỉnh sửa hồ sơ' : (lang === 'ja' ? 'プロフィールを編集' : 'Edit profile')}
          </Link>
        </div>
      </div>

      {/* Settings sections */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] px-1 mb-3">
          {lang === 'vi' ? 'CÁC MỤC CÀI ĐẶT' : (lang === 'ja' ? '設定セクション' : 'SETTINGS SECTIONS')}
        </p>
        {sections.map(({ icon: Icon, label, description, path }) => (
          <Link
            key={label}
            href={path || '#'}
            className={cn(
              'card-base p-4 flex items-center gap-4 transition-all',
              !path ? 'opacity-50 cursor-not-allowed select-none' : 'hover:border-[var(--color-interactive-primary)] hover:shadow-md'
            )}
            onClick={(e) => !path && e.preventDefault()}
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0">
              <Icon className={cn("w-4 h-4", path ? "text-[var(--color-interactive-primary)]" : "text-[var(--color-text-tertiary)]")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!path && (
                <span className="text-[10px] font-semibold bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] px-1.5 py-0.5 rounded">
                  {lang === 'vi' ? 'Sớm' : (lang === 'ja' ? '近日' : 'Soon')}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
