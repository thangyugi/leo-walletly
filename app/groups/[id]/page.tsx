'use client'

import { use } from 'react'
import { GroupDetailView } from '@/features/groups/group-detail-view'

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <GroupDetailView groupId={id} />
}
