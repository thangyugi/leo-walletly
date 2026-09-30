import { SettingsLayout } from '@/features/settings/components/SettingsLayout'

export const metadata = {
  title: 'Settings',
  description: 'Manage your profile and account preferences.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>
}
