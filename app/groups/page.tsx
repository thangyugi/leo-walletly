'use client'

import { GroupManagementPlatform } from '@/modules/group-management'
import { useSettingsStore } from '@/stores/settings'

export default function GroupsPage() {
  const { lang } = useSettingsStore()
  
  // Ensure we only pass valid lang to the platform
  const validLang = (['ja', 'vi', 'en'].includes(lang) ? lang : 'en') as 'ja' | 'vi' | 'en'
  
  return (
    <main className="h-[calc(100vh-0px)] overflow-hidden">
      <GroupManagementPlatform lang={validLang} />
    </main>
  )
}
