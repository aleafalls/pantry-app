interface Props {
  itemCount: number
  lowCount: number
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 rounded-[14px] px-3 py-2.5 flex flex-col gap-0.5"
      style={{
        background: 'var(--glass-card)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid oklch(100% 0 0 / 0.6)',
        boxShadow: '0 1px 0 oklch(100% 0 0 / 0.7) inset, 0 4px 14px -8px oklch(30% 0.02 85 / 0.25)',
      }}
    >
      {children}
    </div>
  )
}

export default function StatCards({ itemCount, lowCount }: Props) {
  const hasLow = lowCount > 0

  return (
    <div className="flex gap-2">
      <GlassCard>
        <span className="text-[17px] font-extrabold" style={{ color: 'var(--foreground)' }}>
          {itemCount}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
          Items
        </span>
      </GlassCard>

      <div
        className="flex-1 rounded-[14px] px-3 py-2.5 flex flex-col gap-0.5"
        style={{
          background: hasLow
            ? 'color-mix(in oklch, #EE1B49 22%, white 78%)'
            : 'var(--glass-card)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid oklch(100% 0 0 / 0.5)',
          boxShadow: hasLow
            ? '0 1px 0 oklch(100% 0 0 / 0.6) inset, 0 4px 14px -8px #EE1B4955'
            : '0 1px 0 oklch(100% 0 0 / 0.7) inset, 0 4px 14px -8px oklch(30% 0.02 85 / 0.25)',
        }}
      >
        <span
          className="text-[17px] font-extrabold"
          style={{ color: hasLow ? '#C81440' : 'var(--foreground)' }}
        >
          {lowCount}
        </span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: hasLow ? '#C81440' : 'var(--muted)' }}
        >
          Low
        </span>
      </div>
    </div>
  )
}
