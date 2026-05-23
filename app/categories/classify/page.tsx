import { ClassifyPage } from '@/features/groups/classify-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Phân loại giao dịch | Walletly',
}

export default function ClassifyRoute() {
  return <ClassifyPage />
}
