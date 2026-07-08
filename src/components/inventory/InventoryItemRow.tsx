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

// Exact specs from Figma node 31:109
const LOW_BADGE: React.CSSProperties = {
  background: '#FFE8DC',
  border: '1px solid #FFA070',
  borderRadius: 9,
  padding: '4px 6px',
  fontSize: 10,
  fontWeight: 700,
  color: '#9C3400',
  lineHeight: '10px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const OUT_BADGE: React.CSSProperties = {
  background: '#FFE4EA',
  border: '1px solid #EE1B49',
  borderRadius: 9,
  padding: '4px 6px',
  fontSize: 10,
  fontWeight: 700,
  color: '#86001D',
  lineHeight: '10px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const LOCATION_BADGE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--divider)',
  borderRadius: 9,
  padding: '4px 6px',
  fontSize: 9,
  fontWeight: 500,
  color: 'var(--muted)',
  lineHeight: '10px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
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

      {/* Right side: badge (if any) + qty — all on one line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {showMultiLocation && (
          <span style={LOCATION_BADGE}>{locationSummary}</span>
        )}
        {isCritical && <span style={OUT_BADGE}>Out</span>}
        {!isCritical && isLow && <span style={LOW_BADGE}>Low</span>}
        <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
          {totalQty} {unit}
        </span>
      </div>
    </button>
  )
}
