'use client'

import DrawerSelect, { SelectOption } from '@/components/ui/DrawerSelect'
import { LOCATIONS, CATEGORIES } from '@/lib/constants'

interface Props {
  locationFilters: string[]
  onLocationFiltersChange: (values: string[]) => void
  categoryFilters: string[]
  onCategoryFiltersChange: (values: string[]) => void
  tagFilters: string[]
  onTagFiltersChange: (values: string[]) => void
  tagOptions: string[]
  stockFilters: string[]
  onStockFiltersChange: (values: string[]) => void
}

const locationOptions: SelectOption[] = LOCATIONS.map(l => ({ value: l.value, label: `${l.emoji} ${l.label}` }))
const categoryOptions: SelectOption[] = CATEGORIES.map(c => ({ value: c, label: c }))
const stockOptions: SelectOption[] = [
  { value: 'out', label: 'Out' },
  { value: 'low', label: 'Low' },
  { value: 'full', label: 'Fully Stocked' },
]

// Out-of-stock items are hidden until the user opts in — this is the "off" state for the Stock chip.
export const DEFAULT_STOCK_FILTERS = ['low', 'full']

function sameFilterSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedB = [...b].sort()
  return [...a].sort().every((v, i) => v === sortedB[i])
}

export function FilterChip({ label, count, active, onClick }: { label: string; count: number; active?: boolean; onClick: () => void }) {
  const isActive = active ?? count > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap"
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 99,
        fontWeight: isActive ? 700 : 500,
        cursor: 'pointer',
        border: isActive ? '2px solid var(--yellow)' : '1px solid var(--divider)',
        background: isActive ? 'var(--yellow-light)' : 'rgb(234, 230, 222)',
        color: isActive ? '#4A3300' : 'var(--foreground)',
        fontFamily: 'inherit',
      }}
    >
      {label}
      {isActive && (
        <span
          className="inline-flex items-center justify-center text-11 font-extrabold"
          style={{
            minWidth: 18, height: 18, borderRadius: 99, padding: '0 5px',
            background: '#4A3300', color: 'var(--yellow-light)', lineHeight: 1,
          }}
        >
          {count}
        </span>
      )}
      <i className="fi-rr-angle-down" style={{ fontSize: 11, display: 'block', lineHeight: 1, color: isActive ? '#4A3300' : 'var(--muted)' }} />
    </button>
  )
}

export default function InventoryFilterBar({
  locationFilters, onLocationFiltersChange,
  categoryFilters, onCategoryFiltersChange,
  tagFilters, onTagFiltersChange,
  tagOptions,
  stockFilters, onStockFiltersChange,
}: Props) {
  return (
    <div className="no-scrollbar -mx-5 px-5" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      <DrawerSelect
        title="Location"
        multiple
        values={locationFilters}
        onChangeMultiple={onLocationFiltersChange}
        options={locationOptions}
        renderTrigger={open => <FilterChip label="Location" count={locationFilters.length} onClick={open} />}
      />
      <DrawerSelect
        title="Category"
        multiple
        values={categoryFilters}
        onChangeMultiple={onCategoryFiltersChange}
        options={categoryOptions}
        renderTrigger={open => <FilterChip label="Category" count={categoryFilters.length} onClick={open} />}
      />
      <DrawerSelect
        title="Tags"
        multiple
        values={tagFilters}
        onChangeMultiple={onTagFiltersChange}
        options={tagOptions.map(t => ({ value: t, label: t }))}
        renderTrigger={open => <FilterChip label="Tags" count={tagFilters.length} onClick={open} />}
      />
      <DrawerSelect
        title="Stock"
        multiple
        values={stockFilters}
        onChangeMultiple={onStockFiltersChange}
        options={stockOptions}
        renderTrigger={open => (
          <FilterChip
            label="Stock"
            count={stockFilters.length}
            active={!sameFilterSet(stockFilters, DEFAULT_STOCK_FILTERS)}
            onClick={open}
          />
        )}
      />
    </div>
  )
}
