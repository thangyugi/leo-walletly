'use client'

import { ComingSoon } from '@/features/settings/components/ComingSoon'
import { useTranslation } from '@/hooks/useTranslation'

export default function Page() {
  const { t } = useTranslation()
  return <ComingSoon title={t.settings.sidebar.connectedApps} icon="rocket" />
}
