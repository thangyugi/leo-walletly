'use client'

import { use } from 'react'
import { GroupDetailView } from '@/features/groups/group-detail-view'

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const groupId = id.length > 36 ? id.slice(-36) : id
  return <GroupDetailView groupId={groupId} />
}
