import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { LOCATIONS } from '@/lib/constants'

interface InventoryRow {
  id: string
  quantity: number
  location: string
  items: { id: string; name: string; emoji: string | null }
}
interface Props {
  items: InventoryRow[]
  totalLowCount: number
}

const LOCATION_LABELS: Record<string, string> = Object.fromEntries(LOCATIONS.map(l => [l.value, l.label]))

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
        <Link href="/shopping" className="text-xs font-bold" style={{ color: 'var(--amber)', textDecoration: 'none' }}>
          View list
        </Link>
      </div>

      {items.map((inv, i) => {
        const isCritical = inv.quantity === 0
        return (
          <Link key={inv.id} href={`/inventory/${inv.items.id}`}
            className="flex items-center px-0.5 py-7px gap-9px"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none', textDecoration: 'none' }}>
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
          </Link>
        )
      })}
    </div>
  )
}
