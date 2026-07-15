'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MENU_ITEMS = [
  { href: '/settings/household', icon: 'fi-sr-users', label: 'Household' },
  { href: '/chef/preferences', icon: 'fi-sr-user-chef', label: 'Chef Preferences' },
  { href: '/settings', icon: 'fi-sr-settings', label: 'Settings' },
]

const appVersion = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA
  ? process.env.NEXT_PUBLIC_GIT_COMMIT_SHA.slice(0, 7)
  : 'dev'

export default function AccountMenu({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    onOpenChange(false)
    router.push('/auth')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="px-4 pt-8 pb-6 flex flex-col gap-1"
        style={{
          background: 'oklch(99% 0.003 85 / 0.92)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: 'none',
          borderLeft: '1px solid oklch(100% 0 0 / 0.6)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 12px', marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Lemmy" style={{ width: 80, height: 80 }} />
          <span className="text-base font-extrabold" style={{ color: 'var(--foreground)' }}>
            Lemmy
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MENU_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 12px', borderRadius: 14,
                textDecoration: 'none', color: 'var(--foreground)',
                background: 'var(--glass-card)',
                backdropFilter: 'blur(14px) saturate(180%)',
                WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                border: '1px solid oklch(100% 0 0 / 0.6)',
                boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
              }}
            >
              <i className={item.icon} style={{ fontSize: 18, display: 'block', lineHeight: 1, color: 'var(--foreground)' }} />
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: 'flex', width: '100%', padding: '14px 16px',
            border: '1.5px solid var(--divider)', background: 'var(--surface)',
            color: 'var(--red)', fontWeight: 700,
          }}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
        <p className="text-11" style={{ textAlign: 'center', color: 'var(--muted-light)', marginTop: 10 }}>
          Version {appVersion}
        </p>
      </SheetContent>
    </Sheet>
  )
}
