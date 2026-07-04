interface InventoryRow {
  id: string
  purchase_date: string
  location: string
  items: {
    name: string
    emoji: string | null
  }
}

interface Props {
  items: InventoryRow[]
}

function weeksAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'today'
  if (diffDays < 7) return `${diffDays}d ago`
  const weeks = Math.floor(diffDays / 7)
  return `${weeks} wk${weeks !== 1 ? 's' : ''} ago`
}

export default function UseTheseUp({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[13.5px] font-extrabold uppercase tracking-[0.03em] px-0.5"
        style={{ color: 'var(--foreground)' }}
      >
        Use these up
      </span>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.slice(0, 5).map(inv => (
          <div
            key={inv.id}
            className="flex-shrink-0 flex flex-col gap-1 rounded-xl px-3 py-2.5 min-w-[108px]"
            style={{ background: 'var(--surface)' }}
          >
            <span className="text-lg leading-none">{inv.items.emoji ?? '📦'}</span>
            <span
              className="text-xs font-bold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              {inv.items.name}
            </span>
            <span className="text-[10.5px]" style={{ color: 'var(--muted-light)' }}>
              {weeksAgo(inv.purchase_date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
