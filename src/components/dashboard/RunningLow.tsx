interface InventoryRow {
  id: string
  quantity: number
  unit: string
  location: string
  items: {
    name: string
    emoji: string | null
  }
}

interface Props {
  items: InventoryRow[]
  totalLowCount: number
}

const LOCATION_LABELS: Record<string, string> = {
  pantry: 'Pantry',
  fridge: 'Fridge',
  freezer: 'Freezer',
  spice_rack: 'Spice rack',
}

export default function RunningLow({ items, totalLowCount }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      {/* Section header */}
      <div className="flex items-center justify-between px-0.5 pb-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[13.5px] font-extrabold uppercase tracking-[0.03em]"
            style={{ color: 'var(--foreground)' }}
          >
            Running low
          </span>
          <span
            className="text-[11px] font-extrabold text-white flex items-center justify-center
                       min-w-[18px] h-[18px] px-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #EE1B49, #C81440)',
            }}
          >
            {totalLowCount}
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--amber)' }}>
          View all
        </span>
      </div>

      {/* Item rows */}
      {items.map((inv, i) => {
        const isCritical = inv.quantity === 0
        const dotColor = isCritical ? '#EE1B49' : '#FFA070'
        const qtyColor = isCritical ? '#C81440' : '#B85A2E'
        const isLast = i === items.length - 1

        return (
          <div
            key={inv.id}
            className="flex items-center gap-2.5 py-[7px] px-0.5"
            style={{
              borderBottom: isLast ? 'none' : '1px solid var(--divider)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
            <span className="text-base leading-none">{inv.items.emoji ?? '📦'}</span>
            <span
              className="text-[13px] font-semibold flex-1 truncate"
              style={{ color: 'var(--foreground)' }}
            >
              {inv.items.name}
            </span>
            <span className="text-[11.5px] shrink-0" style={{ color: 'var(--muted-light)' }}>
              {LOCATION_LABELS[inv.location] ?? inv.location}
            </span>
            <span
              className="text-xs font-bold w-6 text-right shrink-0"
              style={{ color: qtyColor }}
            >
              {inv.quantity}
            </span>
          </div>
        )
      })}
    </div>
  )
}
