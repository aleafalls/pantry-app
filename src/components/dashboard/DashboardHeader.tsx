'use client'

import { useEffect, useState } from 'react'

const AVATAR_COLORS = [
  { bg: '#FFD333', text: '#4A3300' },
  { bg: '#23967F', text: '#ffffff' },
  { bg: '#EE1B49', text: '#ffffff' },
  { bg: '#7C5CBF', text: '#ffffff' },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface Props {
  householdName: string
  members: { display_name: string | null }[]
}

export default function DashboardHeader({ householdName, members }: Props) {
  const [greeting, setGreeting] = useState('')
  useEffect(() => { setGreeting(getGreeting()) }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        // Exact design spec: padding 24px 20px 14px
        padding: '24px 20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'oklch(99% 0.003 85 / 0.75)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.5)',
        boxShadow: '0 1px 0 oklch(100% 0 0 / 0.6) inset',
      }}
    >
      {/* Top row: greeting + name + avatars */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
            {greeting || ' '}
          </span>
          <span style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--foreground)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            {householdName}
          </span>
        </div>

        {/* Avatar stack */}
        <div style={{ display: 'flex', marginLeft: 8 }}>
          {members.slice(0, 4).map((member, i) => {
            const colors = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const initial = member.display_name?.[0]?.toUpperCase() ?? '?'
            return (
              <div
                key={i}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: colors.bg,
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid oklch(97.5% 0.012 85)',
                  marginLeft: i > 0 ? -10 : 0,
                  position: 'relative',
                  zIndex: members.length - i,
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
            )
          })}
        </div>
      </div>
    </header>
  )
}
