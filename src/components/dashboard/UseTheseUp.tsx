interface InventoryRow {
  id: string
  purchase_date: string
  items: { name: string; emoji: string | null }
}
interface Props { items: InventoryRow[] }

function weeksAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  const w = Math.floor(days / 7)
  return `${w} wk${w !== 1 ? 's' : ''} ago`
}

export default function UseTheseUp({ items }: Props) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-135 font-extrabold uppercase tracking-003 block px-0.5"
        style={{ color: 'var(--foreground)' }}>
        Use these up
      </span>
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {items.slice(0, 5).map(inv => (
          <div key={inv.id}
            className="shrink-0 flex flex-col gap-1 rounded-xl py-2 px-3 min-w-108px"
            style={{ background: 'var(--surface)' }}>
            <span className="text-lg leading-none">{inv.items.emoji ?? '📦'}</span>
            <span className="text-xs font-bold leading-snug" style={{ color: 'var(--foreground)' }}>
              {inv.items.name}
            </span>
            <span className="text-105" style={{ color: 'var(--muted-light)' }}>
              {weeksAgo(inv.purchase_date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
