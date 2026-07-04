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

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <header
      className="sticky top-0 z-10 px-5 pt-6 pb-4 flex flex-col gap-3"
      style={{
        background: 'var(--glass-header)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.5)',
        boxShadow: '0 1px 0 oklch(100% 0 0 / 0.6) inset',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            {greeting || 'Hello'}
          </span>
          <span
            className="text-[22px] font-extrabold leading-tight tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {householdName}
          </span>
        </div>

        {/* Avatar stack */}
        <div className="flex items-center ml-2">
          {members.slice(0, 4).map((member, i) => {
            const colors = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const initial = member.display_name?.[0]?.toUpperCase() ?? '?'
            return (
              <div
                key={i}
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center
                           text-[13px] font-extrabold shrink-0"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: '2px solid oklch(97.5% 0.012 85)',
                  marginLeft: i > 0 ? '-10px' : 0,
                  zIndex: members.length - i,
                  position: 'relative',
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
