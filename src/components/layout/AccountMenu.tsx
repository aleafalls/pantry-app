'use client'

import Link from 'next/link'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MENU_ITEMS = [
  { href: '/settings/household', icon: 'fi-sr-users', label: 'Household' },
  { href: '/chef/preferences', icon: 'fi-sr-user-chef', label: 'Chef Preferences' },
  { href: '/settings', icon: 'fi-sr-settings', label: 'Settings' },
]

export default function AccountMenu({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="rounded-l-3xl px-4 pt-8 pb-8 flex flex-col gap-1"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 12px', marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Lemmy" style={{ width: 80, height: 80 }} />
          <span className="text-base font-extrabold" style={{ color: 'var(--foreground)' }}>
            Lemmy
          </span>
        </div>

        {MENU_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onOpenChange(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 12px', borderRadius: 14,
              textDecoration: 'none', color: 'var(--foreground)',
            }}
          >
            <i className={item.icon} style={{ fontSize: 18, display: 'block', color: 'var(--foreground)' }} />
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        ))}
      </SheetContent>
    </Sheet>
  )
}
