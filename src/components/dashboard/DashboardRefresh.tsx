'use client'

import { useRouter } from 'next/navigation'
import PullToRefresh from '@/components/ui/PullToRefresh'

export default function DashboardRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <PullToRefresh onRefresh={async () => { router.refresh() }}>
      {children}
    </PullToRefresh>
  )
}
