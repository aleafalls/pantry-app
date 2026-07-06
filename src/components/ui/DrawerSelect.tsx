'use client'

import { useState } from 'react'
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
  value: string
  onChange: (value: string) => void
  title: string
  placeholder?: string
  options?: SelectOption[]
  groups?: SelectGroup[]
  searchable?: boolean
}

function Pill({ label, selected, onSelect }: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-full text-sm whitespace-nowrap transition-colors ${selected ? 'font-bold' : 'font-medium'}`}
      style={{
        padding: '9px 16px',
        border: selected ? '2px solid var(--yellow)' : '1.5px solid var(--divider)',
        background: selected ? 'var(--yellow)' : 'oklch(100% 0 0 / 0.7)',
        color: selected ? '#4A3300' : 'var(--foreground)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

export default function DrawerSelect({
  value, onChange, title, placeholder = 'Select…',
  options, groups, searchable = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const allOptions = options ?? groups?.flatMap(g => g.options) ?? []
  const selectedLabel = allOptions.find(o => o.value === value)?.label ?? ''

  const q = search.toLowerCase()
  const filteredOptions = options?.filter(o => !q || o.label.toLowerCase().includes(q))
  const filteredGroups = groups
    ?.map(g => ({ ...g, options: g.options.filter(o => !q || o.label.toLowerCase().includes(q)) }))
    .filter(g => g.options.length > 0)

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <Drawer open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch('') }}>

      {/* Trigger — glass input style */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between rounded-xl text-sm text-left"
        style={{
          padding: '12px 14px',
          background: 'oklch(100% 0 0 / 0.6)',
          border: '1px solid oklch(100% 0 0 / 0.5)',
          color: value ? 'var(--foreground)' : 'var(--muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span className={value ? 'font-medium' : ''}>{selectedLabel || placeholder}</span>
        <i className="fi-rr-angle-down" style={{ fontSize: 13, display: 'block', color: 'var(--muted)' }} />
      </button>

      {/* Drawer */}
      <DrawerContent
        className="flex flex-col outline-none"
        style={{
          background: 'oklch(97% 0.006 85)',
          border: 'none',
          maxHeight: '65vh',
        }}
      >
        {/* Header */}
        <DrawerHeader className="flex items-center gap-4 px-5 pt-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={() => { setOpen(false); setSearch('') }}
            className="flex items-center justify-center rounded-full text-lg font-semibold shrink-0"
            style={{
              width: 36, height: 36,
              background: 'var(--surface)',
              border: 'none', cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            ×
          </button>
          <DrawerTitle className="text-[28px] font-extrabold m-0" style={{ color: 'var(--foreground)' }}>
            {title}
          </DrawerTitle>
        </DrawerHeader>

        {/* Scrollable pill area */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-2">
          {filteredGroups ? (
            filteredGroups.map(group => (
              <div key={group.label} className="mb-5">
                <p className="text-11 font-extrabold uppercase tracking-003 mb-2.5"
                  style={{ color: 'var(--muted)' }}>
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map(opt => (
                    <Pill
                      key={opt.value}
                      label={opt.label}
                      selected={value === opt.value}
                      onSelect={() => handleSelect(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredOptions?.map(opt => (
                <Pill
                  key={opt.value}
                  label={opt.label}
                  selected={value === opt.value}
                  onSelect={() => handleSelect(opt.value)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Search — pinned to bottom */}
        {searchable && (
          <div className="shrink-0 px-5 pt-2 pb-7" style={{ borderTop: '1px solid var(--divider)' }}>
            <div className="relative">
              <i className="fi-rr-search" style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 16, display: 'block', color: 'var(--muted)',
              }} />
              <Input
                type="text"
                placeholder="Search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                className="rounded-xl text-sm pl-10"
                style={{
                  background: 'oklch(100% 0 0 / 0.6)',
                  borderColor: 'oklch(100% 0 0 / 0.5)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
