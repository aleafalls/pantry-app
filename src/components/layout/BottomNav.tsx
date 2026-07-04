'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',          icon: 'fi-rr-home',          label: 'Home' },
  { href: '/inventory', icon: 'fi-rr-box',            label: 'Inventory' },
  { href: '/add',       icon: null,                   label: 'Add' },
  { href: '/shopping',  icon: 'fi-rr-shopping-cart',  label: 'Shopping' },
  { href: '/settings',  icon: 'fi-rr-settings',       label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[350px] z-50
                 flex items-center justify-around px-6 py-3 rounded-[28px]"
      style={{
        background: 'var(--glass-nav)',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        border: '1px solid oklch(100% 0 0 / 0.55)',
        boxShadow: '0 1px 0 oklch(100% 0 0 / 0.7) inset, 0 10px 30px -10px oklch(30% 0.02 85 / 0.35)',
      }}
    >
      {tabs.map(tab => {
        const isActive = pathname === tab.href
        const isAdd = tab.label === 'Add'

        if (isAdd) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center justify-center w-[46px] h-[46px] rounded-full
                         text-[22px] font-extrabold -mt-8 shrink-0"
              style={{
                background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                color: '#4A3300',
                border: '1px solid oklch(100% 0 0 / 0.7)',
                boxShadow: '0 1px 0 oklch(100% 0 0 / 0.8) inset, 0 8px 18px -4px oklch(70% 0.15 90 / 0.65)',
              }}
            >
              +
            </Link>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center justify-center w-10 h-10"
            style={{ opacity: isActive ? 1 : 0.4 }}
            aria-label={tab.label}
          >
            <i className={`${tab.icon} text-[20px]`} style={{ color: 'var(--foreground)' }} />
          </Link>
        )
      })}
    </nav>
  )
}
