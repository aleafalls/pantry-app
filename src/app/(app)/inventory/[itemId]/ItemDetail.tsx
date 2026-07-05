'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import { LOCATIONS } from '@/lib/constants'

interface InventoryRow {
  id: string
  location: string
  quantity: number
  unit: string
  manual_low_flag: boolean
  updated_at: string
}

interface Item {
  id: string
  name: string
  emoji: string | null
  category: string
  tags: string[]
  low_threshold: number
  household_id: string
}

interface Props {
  item: Item
  inventoryRows: InventoryRow[]
  userId: string
}

function locationInfo(val: string) {
  return LOCATIONS.find(l => l.value === val) ?? { label: val, emoji: '📦' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ItemDetail({ item, inventoryRows, userId }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState(inventoryRows)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [lowThreshold, setLowThreshold] = useState(item.low_threshold)
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [manualLow, setManualLow] = useState(inventoryRows.some(r => r.manual_low_flag))
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const mostRecent = rows.reduce<InventoryRow | null>((a, b) =>
    !a || b.updated_at > a.updated_at ? b : a, null)

  async function saveQty(rowId: string) {
    const parsed = parseFloat(editQty)
    if (isNaN(parsed) || parsed < 0) { setEditingRowId(null); return }
    const supabase = createClient()
    await supabase.from('inventory').update({ quantity: parsed, added_by: userId }).eq('id', rowId)
    setRows(rows.map(r => r.id === rowId ? { ...r, quantity: parsed } : r))
    setEditingRowId(null)
  }

  async function saveThreshold(val: number) {
    setLowThreshold(val)
    const supabase = createClient()
    await supabase.from('items').update({ low_threshold: val }).eq('id', item.id)
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags)
    const supabase = createClient()
    await supabase.from('items').update({ tags: newTags }).eq('id', item.id)
  }

  async function toggleManualLow() {
    const next = !manualLow
    setManualLow(next)
    const supabase = createClient()
    await supabase.from('inventory').update({ manual_low_flag: next }).eq('item_id', item.id)
  }

  async function removeItem() {
    setRemoving(true)
    const supabase = createClient()
    await supabase.from('items').update({ active: false }).eq('id', item.id)
    router.push('/inventory')
  }

  const section = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>
      <PageHeader title={item.name} backHref="/inventory" />

      <div style={{ padding: '20px 20px 0' }}>

        {/* Item identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, fontSize: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', flexShrink: 0,
          }}>
            {item.emoji ?? '📦'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{item.name}</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{item.category}</p>
          </div>
        </div>

        {/* Stock per location */}
        {section('Stock')}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--divider)', marginBottom: 20 }}>
          {rows.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No stock recorded yet.</p>
            </div>
          ) : rows.map((row, i) => {
            const loc = locationInfo(row.location)
            const isEditing = editingRowId === row.id
            return (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--divider)' : 'none',
                background: 'oklch(100% 0 0 / 0.4)',
              }}>
                <span style={{ fontSize: 18 }}>{loc.emoji}</span>
                <span className="text-sm font-semibold flex-1" style={{ color: 'var(--foreground)' }}>
                  {loc.label}
                </span>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Input
                      type="number"
                      autoFocus
                      value={editQty}
                      onChange={e => setEditQty(e.target.value)}
                      onBlur={() => saveQty(row.id)}
                      onKeyDown={e => e.key === 'Enter' && saveQty(row.id)}
                      className="rounded-lg text-sm text-right"
                      style={{
                        width: 72, padding: '6px 10px',
                        background: 'oklch(100% 0 0 / 0.8)',
                        borderColor: 'var(--yellow)',
                        color: 'var(--foreground)',
                      }}
                    />
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{row.unit}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingRowId(row.id); setEditQty(String(row.quantity)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      borderRadius: 8,
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{row.quantity}</span>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{row.unit}</span>
                    <i className="fi-rr-edit" style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Details */}
        {section('Details')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

          {/* Low threshold */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Alert when below</p>
              <p className="text-11" style={{ color: 'var(--muted)' }}>Currently {lowThreshold} {rows[0]?.unit ?? ''}</p>
            </div>
            <QuantityStepper value={lowThreshold} onChange={saveThreshold} min={0} />
          </div>

          {/* Manual low flag */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Mark as running low</p>
              <p className="text-11" style={{ color: 'var(--muted)' }}>Adds to shopping list regardless of quantity</p>
            </div>
            <button
              onClick={toggleManualLow}
              style={{
                width: 48, height: 28, borderRadius: 99, flexShrink: 0,
                background: manualLow ? 'var(--yellow)' : 'var(--divider)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: manualLow ? 23 : 3,
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)', marginBottom: 8 }}>Tags</p>
            <TagInput tags={tags} onChange={saveTags} />
          </div>
        </div>

        {/* Attribution */}
        {mostRecent && (
          <p className="text-11" style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Last updated {formatDate(mostRecent.updated_at)}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          <Button
            variant="brand"
            onClick={() => router.push(`/add/restock/${item.id}`)}
            style={{
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300',
              padding: '14px 16px',
            }}
          >
            Restock
          </Button>

          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px', color: 'var(--red)', fontSize: 14, fontWeight: 600,
              }}
            >
              Remove item
            </button>
          ) : (
            <div style={{
              padding: '16px', borderRadius: 14, background: 'color-mix(in oklch, #EE1B49 10%, white 90%)',
              border: '1px solid color-mix(in oklch, #EE1B49 30%, white 70%)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
                Remove {item.name} from your pantry?
              </p>
              <p className="text-11" style={{ color: 'var(--muted)' }}>
                This hides the item but doesn&apos;t delete your history.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={removeItem}
                  disabled={removing}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                    background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {removing ? 'Removing…' : 'Yes, remove'}
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10,
                    border: '1px solid var(--divider)', background: 'none',
                    color: 'var(--foreground)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
