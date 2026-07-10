'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = [
  { value: 'all', label: 'All', href: '/chef' },
  { value: 'tonight', label: 'Tonight', href: '/chef/tonight' },
  { value: 'ideas', label: 'Ideas', href: '/chef/ideas' },
  { value: 'saved', label: 'Saved', href: '/chef/saved' },
]

export default function ChefTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const activeValue = TABS.find(tab =>
    tab.href === '/chef' ? pathname === '/chef' : pathname.startsWith(tab.href)
  )?.value ?? 'all'

  return (
    <Tabs
      value={activeValue}
      onValueChange={value => {
        const tab = TABS.find(t => t.value === value)
        if (tab) router.push(tab.href)
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4">
        {TABS.map(tab => {
          const isActive = tab.value === activeValue
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              style={isActive ? {
                backdropFilter: 'blur(14px) saturate(180%)',
                WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                border: '1px solid oklch(100% 0 0 / 0.6)',
                background: 'var(--glass-card)',
                boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
                color: 'var(--foreground)',
                fontWeight: 700,
              } : {
                background: 'transparent',
                color: 'var(--muted)',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
