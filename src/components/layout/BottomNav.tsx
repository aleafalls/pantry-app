'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',          icon: 'fi-sr-home',                label: 'Home'      },
  { href: '/inventory', icon: 'fi-sr-carrot',              label: 'Inventory' },
  { href: '/add',       icon: null,                        label: null        }, // Add button
  { href: '/shopping',  icon: 'fi-sr-shopping-cart-check', label: 'Shopping'  },
  { href: '/chef',      icon: 'fi-sr-user-chef',           label: 'Chef'      },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  return (
    <div
      className="fixed z-50"
      style={{
        bottom: 16,
        left:  'max(20px, calc(50% - 310px))',
        right: 'max(20px, calc(50% - 310px))',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: 4,
          borderRadius: 32,
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(11px) saturate(180%)',
          WebkitBackdropFilter: 'blur(11px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0px 2px 25px 0px rgba(51, 48, 43, 0.12)',
        }}
      >
        {tabs.map(tab => {
          const active = isActive(tab.href)
          const isAdd = tab.icon === null

          if (isAdd) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Add item"
                style={{
                  width: 50,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderRadius: '4px 23px 4px 23px',
                  backgroundImage: 'linear-gradient(159.5deg, rgba(254,231,138,0.77) 8.63%, rgba(255,211,51,0.77) 90.66%)',
                  border: '1px solid #FFE57C',
                  boxShadow: '0px 1px 15px -3px rgba(255, 211, 51, 0.6)',
                  textDecoration: 'none',
                }}
              >
                <i className="fi-sr-plus-small" style={{ fontSize: 22, display: 'block', lineHeight: 1, color: '#4A3300' }} />
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label ?? ''}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '8px 4px',
                borderRadius: 28,
                background: active ? '#EAE6DE' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s',
                overflow: 'hidden',
              }}
            >
              <i
                className={tab.icon!}
                style={{
                  fontSize: 20,
                  display: 'block',
                  lineHeight: 1,
                  color: '#33302B',
                }}
              />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#33302B',
                whiteSpace: 'nowrap',
                lineHeight: 'normal',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
