'use client'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  label?: string
}

const FILL = 'lab(99 0.1 1.08)'
const BORDER = '1px solid oklch(100% 0 0 / 0.5)'

export default function QuantityStepper({ value, onChange, min = 1, label }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {label && (
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            width: 44, height: 44,
            borderRadius: '12px 0 0 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 600,
            background: FILL,
            border: BORDER,
            color: 'var(--foreground)',
            cursor: value <= min ? 'not-allowed' : 'pointer',
            opacity: value <= min ? 0.4 : 1,
          }}
        >
          −
        </button>
        <div style={{
          flex: 1, height: 44, minWidth: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 800,
          background: FILL,
          borderTop: BORDER,
          borderBottom: BORDER,
          color: 'var(--foreground)',
        }}>
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          style={{
            width: 44, height: 44,
            borderRadius: '0 12px 12px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 600,
            background: FILL,
            border: BORDER,
            color: 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          <i className="fi-rr-plus" style={{ fontSize: 15, display: 'block', lineHeight: 1 }} />
        </button>
      </div>
    </div>
  )
}
