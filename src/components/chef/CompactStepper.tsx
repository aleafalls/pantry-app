'use client'

interface Props {
  value: number
  baseline: number
  unit: string
  onChange: (value: number) => void
}

export default function CompactStepper({ value, baseline, unit, onChange }: Props) {
  const delta = value - baseline
  const changed = delta !== 0
  const display = changed
    ? `${delta > 0 ? '+' : ''}${delta}${unit ? ` ${unit}` : ''}`
    : `${value}${unit ? ` ${unit}` : ''}`

  const fill = changed ? 'color-mix(in srgb, var(--yellow-light) 55%, lab(99 0.1 1.08))' : 'lab(99 0.1 1.08)'
  const border = changed ? '1px solid var(--yellow)' : '1px solid oklch(100% 0 0 / 0.5)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, width: 104 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 26, height: 26, borderRadius: '8px 0 0 8px',
          border, borderRight: 'none',
          background: fill, color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: value <= 0 ? 'not-allowed' : 'pointer',
          opacity: value <= 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        flex: 1, height: 26, padding: '0 4px', overflow: 'hidden',
        borderTop: border, borderBottom: border,
        background: fill, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap',
      }}>
        {display}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 26, height: 26, borderRadius: '0 8px 8px 0',
          border, borderLeft: 'none',
          background: fill, color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fi-rr-plus" style={{ fontSize: 11, display: 'block', lineHeight: 1 }} />
      </button>
    </div>
  )
}
