'use client'

import { LOCATIONS } from '@/lib/constants'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function LocationSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        Location
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LOCATIONS.map(loc => {
          const isSelected = value === loc.value
          return (
            <button
              key={loc.value}
              type="button"
              onClick={() => onChange(loc.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--yellow)' : '1px solid var(--divider)',
                background: isSelected ? 'var(--yellow-light)' : 'var(--surface)',
                color: isSelected ? '#4A3300' : 'var(--foreground)',
                transition: 'all 0.15s',
              }}
            >
              {loc.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
