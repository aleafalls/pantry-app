'use client'

import { useState, type ReactNode } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectGroup {
  label: string
  options: SelectOption[]
}

interface Props {
  // ── Single-select mode (default) ──────────────────────────
  value?: string
  onChange?: (value: string) => void
  // ── Multi-select mode ─────────────────────────────────────
  multiple?: boolean
  values?: string[]
  onChangeMultiple?: (values: string[]) => void
  // ── Shared ────────────────────────────────────────────────
  title: string
  placeholder?: string
  options?: SelectOption[]
  groups?: SelectGroup[]
  searchable?: boolean
  chipTrigger?: boolean
  disabledValues?: string[]
  /** Multi-select only: inline input for creating a new option */
  onAddNew?: (name: string) => Promise<void>
  addNewPlaceholder?: string
  /** Fully custom trigger — receives a function to open the drawer */
  renderTrigger?: (open: () => void) => ReactNode
}

function Pill({ label, selected, disabled, onSelect }: {
  label: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-full text-sm whitespace-nowrap transition-colors ${selected ? 'font-bold' : 'font-medium'}`}
      style={{
        padding: '9px 16px',
        border: selected ? '2px solid var(--yellow)' : '1.5px solid var(--divider)',
        background: selected ? 'var(--yellow-light)' : 'oklch(100% 0 0 / 0.7)',
        color: selected ? '#4A3300' : 'var(--foreground)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function DrawerSelect({
  value = '', onChange,
  multiple = false, values = [], onChangeMultiple,
  title, placeholder = 'Select…',
  options, groups, searchable = false,
  chipTrigger = false, disabledValues = [],
  onAddNew, addNewPlaceholder = 'Add new…',
  renderTrigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [addingNew, setAddingNew] = useState(false)

  const allOptions = options ?? groups?.flatMap(g => g.options) ?? []

  // Single-select helpers
  const selectedLabel = allOptions.find(o => o.value === value)?.label ?? ''

  // Multi-select helpers
  const selectedLabels = allOptions
    .filter(o => values.includes(o.value))
    .map(o => o.label)
    .join(', ')

  const q = search.toLowerCase()
  const filteredOptions = options?.filter(o => !q || o.label.toLowerCase().includes(q))
  const filteredGroups = groups
    ?.map(g => ({ ...g, options: g.options.filter(o => !q || o.label.toLowerCase().includes(q)) }))
    .filter(g => g.options.length > 0)

  function handleSingleSelect(val: string) {
    onChange?.(val)
    setOpen(false)
    setSearch('')
  }

  function handleMultiToggle(val: string) {
    if (!onChangeMultiple) return
    const next = values.includes(val)
      ? values.filter(v => v !== val)
      : [...values, val]
    onChangeMultiple(next)
    // drawer stays open in multi mode
  }

  async function handleAddNew() {
    const name = newName.trim()
    if (!name || !onAddNew) return
    setAddingNew(true)
    await onAddNew(name)
    setNewName('')
    setAddingNew(false)
  }

  function closeDrawer() {
    setOpen(false)
    setSearch('')
    setNewName('')
  }

  const triggerLabel = multiple
    ? selectedLabels || placeholder
    : selectedLabel || placeholder
  const hasValue = multiple ? values.length > 0 : !!value

  const renderPills = (opts: SelectOption[]) =>
    opts.map(opt => (
      <Pill
        key={opt.value}
        label={opt.label}
        selected={multiple ? values.includes(opt.value) : value === opt.value}
        disabled={disabledValues.includes(opt.value)}
        onSelect={() => multiple ? handleMultiToggle(opt.value) : handleSingleSelect(opt.value)}
      />
    ))

  return (
    <Drawer open={open} onOpenChange={o => { if (!o) closeDrawer(); else setOpen(true) }}>

      {/* Trigger */}
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : chipTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap"
          style={{
            padding: '8px 14px', borderRadius: 99,
            fontWeight: hasValue ? 700 : 500, cursor: 'pointer',
            border: hasValue ? '2px solid var(--yellow)' : '1px solid var(--divider)',
            background: hasValue ? 'var(--yellow-light)' : 'var(--surface)',
            color: hasValue ? '#4A3300' : 'var(--muted)',
            fontFamily: 'inherit',
          }}
        >
          {triggerLabel}
          <i className="fi-rr-angle-down" style={{ fontSize: 11, display: 'block', lineHeight: 1, color: hasValue ? '#4A3300' : 'var(--muted)' }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between rounded-xl text-sm text-left"
          style={{
            padding: '12px 14px',
            background: 'oklch(100% 0 0 / 0.6)',
            border: '1px solid oklch(100% 0 0 / 0.5)',
            color: hasValue ? 'var(--foreground)' : 'var(--muted)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span className={hasValue ? 'font-medium' : ''}>{triggerLabel}</span>
          <i className="fi-rr-angle-down" style={{ fontSize: 13, display: 'block', lineHeight: 1, color: 'var(--muted)' }} />
        </button>
      )}

      {/* Drawer */}
      <DrawerContent
        className="flex flex-col outline-none overflow-hidden"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none', maxHeight: '65vh' }}
      >
        <DrawerHeader className="flex items-center justify-between gap-4 px-5 pt-2 pb-1 shrink-0">
          <DrawerTitle className="text-20 font-extrabold m-0" style={{ color: 'var(--foreground)' }}>
            {title}
          </DrawerTitle>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 36, height: 36, background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--foreground)' }}
          >
            <i className="fi-rr-cross-small" style={{ fontSize: 16, display: 'block' }} />
          </button>
        </DrawerHeader>

        {/* Pills */}
        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-5 py-2">
          {filteredGroups ? (
            filteredGroups.map(group => (
              <div key={group.label} className="mb-5">
                <p className="text-11 font-extrabold uppercase tracking-003 mb-2.5" style={{ color: 'var(--muted)' }}>
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">{renderPills(group.options)}</div>
              </div>
            ))
          ) : (
            <div className="flex flex-wrap gap-2">{renderPills(filteredOptions ?? [])}</div>
          )}
        </div>

        {/* Bottom area: add new + search */}
        {(onAddNew || searchable) && (
          <div className="shrink-0 px-5 pt-2 pb-7 flex flex-col gap-3" style={{ borderTop: '1px solid var(--divider)' }}>

            {/* Inline add new */}
            {onAddNew && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  type="text"
                  placeholder={addNewPlaceholder}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                  autoComplete="off"
                  className="rounded-xl text-sm flex-1"
                  style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={!newName.trim() || addingNew}
                  style={{
                    padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'var(--yellow)', color: '#4A3300', fontWeight: 700, fontSize: 13,
                    opacity: !newName.trim() || addingNew ? 0.4 : 1, flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  {addingNew ? '…' : 'Add'}
                </button>
              </div>
            )}

            {/* Search */}
            {searchable && (
              <div className="relative">
                <i className="fi-rr-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, display: 'block', color: 'var(--muted)' }} />
                <Input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl text-sm pl-10"
                  style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
                />
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
