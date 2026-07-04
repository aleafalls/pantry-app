import { Badge } from '@/components/ui/badge'

interface InventoryRow {
  id: string
  quantity: number
  location: string
  items: { name: string; emoji: string | null }
}
interface Props {
  items: InventoryRow[]
  totalLowCount: number
}

const LOCATION_LABELS: Record<string, string> = {
  pantry: 'Pantry', fridge: 'Fridge', freezer: 'Freezer', spice_rack: 'Spice rack',
}

export default function RunningLow({ items, totalLowCount }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="px-0.5 pb-1">
          <span className="text-135 font-extrabold uppercase tracking-003"
            style={{ color: 'var(--foreground)' }}>Running low</span>
        </div>
        <div className="rounded-xl px-4 py-5 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Items running low will appear here once your pantry is stocked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">

      <div className="flex items-center justify-between px-0.5 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-135 font-extrabold uppercase tracking-003"
            style={{ color: 'var(--foreground)' }}>Running low</span>
          <Badge className="text-11 font-extrabold px-1.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #EE1B49, #C81440)', color: '#fff', border: 'none' }}>
            {totalLowCount}
          </Badge>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--amber)' }}>View all</span>
      </div>

      {items.map((inv, i) => {
        const isCritical = inv.quantity === 0
        return (
          <div key={inv.id}
            className="flex items-center px-0.5 py-7px gap-9px"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <span className="rounded-full shrink-0"
              style={{ width: 6, height: 6, background: isCritical ? '#EE1B49' : '#FFA070' }} />
            <span className="text-base leading-none">{inv.items.emoji ?? '📦'}</span>
            <span className="text-13 font-semibold flex-1 truncate"
              style={{ color: 'var(--foreground)' }}>{inv.items.name}</span>
            <span className="text-115 shrink-0" style={{ color: 'var(--muted-light)' }}>
              {LOCATION_LABELS[inv.location] ?? inv.location}
            </span>
            <span className="text-xs font-bold shrink-0 text-right w-26px"
              style={{ color: isCritical ? '#C81440' : '#B85A2E' }}>
              {inv.quantity}
            </span>
          </div>
        )
      })}
    </div>
  )
}
