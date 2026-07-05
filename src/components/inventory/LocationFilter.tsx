'use client'

import { LOCATIONS } from '@/lib/constants'

interface Props {
  value: string
  onChange: (value: string) => void
}

const allOption = { value: 'all', label: 'All', emoji: null }

export default function LocationFilter({ value, onChange }: Props) {
  const options = [allOption, ...LOCATIONS]

  return (
    <div
      className="no-scrollbar"
      style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}
    >
      {options.map(opt => {
        const isSelected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: isSelected ? 700 : 500,
              cursor: 'pointer',
              border: isSelected ? '2px solid var(--yellow)' : '1px solid var(--divider)',
              background: isSelected ? 'var(--yellow-light)' : 'var(--surface)',
              color: isSelected ? '#4A3300' : 'var(--foreground)',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label}
          </button>
        )
      })}
    </div>
  )
}
