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
}

const locationOptions: SelectOption[] = LOCATIONS.map(l => ({ value: l.value, label: `${l.emoji} ${l.label}` }))
const categoryOptions: SelectOption[] = CATEGORIES.map(c => ({ value: c, label: c }))

function FilterChip({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  const active = count > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap"
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 99,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: active ? '2px solid var(--yellow)' : '1px solid var(--divider)',
        background: active ? 'var(--yellow-light)' : 'var(--surface)',
        color: active ? '#4A3300' : 'var(--foreground)',
        fontFamily: 'inherit',
      }}
    >
      {label}
      {active && (
        <span
          className="inline-flex items-center justify-center text-11 font-extrabold"
          style={{
            minWidth: 18, height: 18, borderRadius: 99, padding: '0 5px',
            background: '#4A3300', color: 'var(--yellow-light)',
          }}
        >
          {count}
        </span>
      )}
      <i className="fi-rr-angle-down" style={{ fontSize: 11, display: 'block', lineHeight: 1, color: active ? '#4A3300' : 'var(--muted)' }} />
    </button>
  )
}

export default function InventoryFilterBar({
  locationFilters, onLocationFiltersChange,
  categoryFilters, onCategoryFiltersChange,
  tagFilters, onTagFiltersChange,
  tagOptions,
}: Props) {
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
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
    </div>
  )
}
