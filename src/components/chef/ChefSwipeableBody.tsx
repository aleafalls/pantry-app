'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs'
import { TABS } from './ChefTabs'

export default function ChefSwipeableBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const activeIndex = TABS.findIndex(tab =>
    tab.href === '/chef' ? pathname === '/chef' : pathname.startsWith(tab.href)
  )

  const bind = useSwipeableTabs(activeIndex === -1 ? 0 : activeIndex, TABS.length, index => {
    router.push(TABS[index].href)
  })

  return <div {...bind()}>{children}</div>
}
