import { ClassifyPage } from '@/features/categories/classify-page'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Phân loại giao dịch | Walletly',
}

export default function ClassifyRoute() {
  return <Suspense fallback={null}><ClassifyPage /></Suspense>
}
