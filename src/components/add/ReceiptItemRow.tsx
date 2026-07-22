'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface Props {
  emoji: string | null
  name: string
  /** Muted subtitle — the original receipt text, shown on matched rows so the match is visible/trustable. */
  subtitle?: string
  price: number | null
  quantity: number
  unit: string
  onQuantityChange: (value: number) => void
  /** Unmatched rows allow correcting the extracted name; matched rows don't (it's an existing item). */
  editableName?: boolean
  onNameChange?: (value: string) => void
}

export default function ReceiptItemRow({
  emoji, name, subtitle, price, quantity, unit, onQuantityChange, editableName, onNameChange,
}: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      width: '100%', padding: '10px 20px',
      background: 'var(--background)',
      borderBottom: '1px solid var(--divider)',
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, width: 28, flexShrink: 0 }}>
        {emoji ?? '📦'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editableName ? (
          <Input
            type="text"
            value={name}
            onChange={e => onNameChange?.(e.target.value)}
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground)', padding: '4px 8px', height: 30 }}
          />
        ) : (
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{name}</p>
        )}
        {(subtitle || price != null) && (
          <p className="text-11 truncate" style={{ color: 'var(--muted)' }}>
            {subtitle}
            {subtitle && price != null ? ' · ' : ''}
            {price != null ? `$${price.toFixed(2)}` : ''}
          </p>
        )}
      </div>

      <CompactPlainStepper value={quantity} unit={unit} onChange={onQuantityChange} />
    </div>
  )
}

// Same compact visual chrome as chef/CompactStepper (and the shopping
// list's qty stepper), but shows the plain value rather than a
// delta-from-baseline — there's no "baseline" concept for a freshly
// scanned receipt quantity. Unit is shown alongside the number, same as
// the shopping list, so a mismatch between the receipt's packaging (e.g.
// "bag") and the item's tracked unit (e.g. "each") is visible at a glance
// instead of only readable from the subtitle text.
function CompactPlainStepper({ value, unit, onChange }: { value: number; unit: string; onChange: (value: number) => void }) {
  // Tapping the number opens the device's numeric keyboard for direct entry
  // — needed for cases like a receipt misreading "48 oz" (one tub) as
  // quantity 48 instead of 1, which is faster to retype than to decrement.
  // null when not editing — the input then just displays `value` from props.
  // While focused it holds the in-progress text, so a trailing "." or an
  // empty field isn't clobbered by a prop re-render on every keystroke.
  const [editingText, setEditingText] = useState<string | null>(null)
  const text = editingText ?? String(value)

  function commit() {
    const parsed = parseFloat(text)
    onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, width: 104 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 26, height: 26, borderRadius: '8px 0 0 8px',
          border: '1px solid oklch(100% 0 0 / 0.5)', borderRight: 'none',
          background: 'lab(99 0.1 1.08)', color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: value <= 0 ? 'not-allowed' : 'pointer',
          opacity: value <= 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        flex: 1, height: 26, padding: '0 4px', overflow: 'hidden',
        borderTop: '1px solid oklch(100% 0 0 / 0.5)', borderBottom: '1px solid oklch(100% 0 0 / 0.5)',
        background: 'lab(99 0.1 1.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={e => { setEditingText(String(value)); e.target.select() }}
          onChange={e => setEditingText(e.target.value.replace(/[^0-9.]/g, ''))}
          onBlur={() => { commit(); setEditingText(null) }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          style={{
            width: 30, minWidth: 0, flexShrink: 1,
            border: 'none', outline: 'none', background: 'transparent', padding: 0,
            textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--foreground)',
          }}
        />
        {unit && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 26, height: 26, borderRadius: '0 8px 8px 0',
          border: '1px solid oklch(100% 0 0 / 0.5)', borderLeft: 'none',
          background: 'lab(99 0.1 1.08)', color: 'var(--foreground)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fi-rr-plus" style={{ fontSize: 11, display: 'block', lineHeight: 1 }} />
      </button>
    </div>
  )
}
