import { Badge } from '@/components/ui/badge'
import { LOCATIONS } from '@/lib/constants'

interface Props {
  itemId: string
  name: string
  emoji: string | null
  totalQty: number
  unit: string
  locations: string[]
  category: string
  isLow: boolean
  isCritical: boolean
  onTap: () => void
}

function locationLabel(loc: string) {
  return LOCATIONS.find(l => l.value === loc)?.label ?? loc
}

export default function InventoryItemRow({
  name, emoji, totalQty, unit, locations, category, isLow, isCritical, onTap,
}: Props) {
  const locationSummary = locations.map(locationLabel).join(' + ')
  const showMultiLocation = locations.length > 1

  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 20px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: 22, lineHeight: 1, width: 28, flexShrink: 0 }}>
        {emoji ?? '📦'}
      </span>

      {/* Name + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-13 font-semibold truncate" style={{ color: 'var(--foreground)' }}>
          {name}
        </p>
        <p className="text-11" style={{ color: 'var(--muted)' }}>
          {category}
        </p>
      </div>

      {/* Right side: qty + badges */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
          {totalQty} {unit}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {showMultiLocation && (
            <Badge
              className="text-11"
              style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--divider)', fontWeight: 500 }}
            >
              {locationSummary}
            </Badge>
          )}
          {isCritical && (
            <Badge className="text-11" style={{ background: '#EE1B49', color: '#fff', border: 'none' }}>
              Out
            </Badge>
          )}
          {!isCritical && isLow && (
            <Badge className="text-11" style={{ background: '#FFA070', color: '#fff', border: 'none' }}>
              Low
            </Badge>
          )}
        </div>
      </div>

      <i className="fi-rr-angle-right" style={{ fontSize: 14, color: 'var(--muted)', display: 'block', flexShrink: 0 }} />
    </button>
  )
}
