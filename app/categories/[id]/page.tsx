'use client'

import { use } from 'react'
import { CategoryDetailView } from '@/features/categories/category-detail-view'

export default function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const categoryId = id.length > 36 ? id.slice(-36) : id
  return <CategoryDetailView categoryId={categoryId} />
}
