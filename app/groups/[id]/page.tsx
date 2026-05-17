'use client'

import { GroupDetailView } from '@/features/groups/group-detail-view'

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  return <GroupDetailView groupId={params.id} />
}
