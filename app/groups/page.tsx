'use client'

import { GroupExplorer } from '@/features/groups/group-explorer'
import { useSettingsStore } from '@/stores/settings'
import { PageHeader } from '@/components/layout/page-header'
import { useTranslation } from '@/hooks/useTranslation'

export default function GroupsPage() {
  const { lang } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div className="h-full flex flex-col gap-6">
      <PageHeader 
        title={t.groups.title} 
        subtitle={t.groups.subtitle}
      />
      
      <div className="flex-1 min-h-0">
        <GroupExplorer lang={lang} />
      </div>
    </div>
  )
}
