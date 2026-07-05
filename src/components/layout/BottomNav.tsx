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
    /*
     * Fixed nav, centered inside the 660px column.
     * left/right: max(20px, 50% - 330px + 20px) keeps 20px inset on mobile
     * and clamps to the column edge on wider screens.
     */
    <div
      className="fixed z-50"
      style={{
        bottom: 16,
        left:  'max(20px, calc(50% - 310px))',
        right: 'max(20px, calc(50% - 310px))',
        overflow: 'visible',
      }}
    >
      <nav
        className="flex items-center justify-around rounded-[28px]"
        style={{
          paddingLeft: 22,
          paddingRight: 22,
          paddingTop: 12,
          paddingBottom: 12,
          background: 'oklch(100% 0 0 / 0.55)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          border: '1px solid oklch(100% 0 0 / 0.55)',
          boxShadow: '0 1px 0 oklch(100% 0 0 / 0.7) inset, 0 10px 30px -10px oklch(30% 0.02 85 / 0.35)',
          overflow: 'visible',
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)
          const isAdd = tab.label === 'Add'

          if (isAdd) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center justify-center rounded-full font-extrabold shrink-0"
                style={{
                  width: 46,
                  height: 46,
                  marginTop: -30,
                  fontSize: 22,
                  background: 'linear-gradient(150deg, #FFE680, #FFD333)',
                  color: '#4A3300',
                  border: '1px solid oklch(100% 0 0 / 0.7)',
                  boxShadow: '0 1px 0 oklch(100% 0 0 / 0.8) inset, 0 8px 18px -4px oklch(70% 0.15 90 / 0.65)',
                  position: 'relative',
                  zIndex: 10,
                }}
                aria-label="Add item"
              >
                +
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, opacity: isActive ? 1 : 0.4 }}
              aria-label={tab.label}
            >
              <i
                className={tab.icon!}
                style={{ fontSize: 19, color: 'var(--foreground)', display: 'block' }}
              />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
