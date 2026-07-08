interface Props {
  itemCount: number
  lowCount: number
}

const glassBase: React.CSSProperties = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
}

export default function StatCards({ itemCount, lowCount }: Props) {
  const hasLow = lowCount > 0

  return (
    <div className="flex gap-2">

      <div className="flex-1 rounded-14 px-3 py-2 flex flex-col gap-0.5"
        style={{ ...glassBase, background: 'var(--glass-card)', boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px' }}>
        <span className="text-17 font-extrabold" style={{ color: 'var(--foreground)' }}>{itemCount}</span>
        <span className="text-11 font-semibold" style={{ color: 'var(--muted)' }}>Items</span>
      </div>

      <div className="flex-1 rounded-14 px-3 py-2 flex flex-col gap-0.5"
        style={{ ...glassBase, background: 'var(--glass-card)', boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px' }}>
        <span className="text-17 font-extrabold" style={{ color: 'var(--muted)' }}>—</span>
        <span className="text-11 font-semibold" style={{ color: 'var(--muted)' }}>Est. value</span>
      </div>

      <div className="flex-1 rounded-14 px-3 py-2 flex flex-col gap-0.5"
        style={{
          ...glassBase,
          background: hasLow ? 'color-mix(in oklch, #EE1B49 22%, white 78%)' : 'var(--glass-card)',
          boxShadow: hasLow
            ? '0 1px 0 oklch(100% 0 0 / 0.6) inset, 0 4px 14px -8px #EE1B4955'
            : 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
        }}>
        <span className="text-17 font-extrabold" style={{ color: hasLow ? '#C81440' : 'var(--foreground)' }}>{lowCount}</span>
        <span className="text-11 font-semibold" style={{ color: hasLow ? '#C81440' : 'var(--muted)' }}>Low</span>
      </div>

    </div>
  )
}
