'use client'

import { PageTitle } from '@/features/settings/components/Field'
import { SessionList } from '@/features/settings/components/SessionList'
import { useTranslation } from '@/hooks/useTranslation'

export default function DevicesPage() {
  const { t } = useTranslation()
  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.settings.sidebar.devices} subtitle={t.settings.security.activeSessionsSub} />
      <SessionList />
    </div>
  )
}
