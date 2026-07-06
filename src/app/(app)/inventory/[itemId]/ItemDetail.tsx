'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import DrawerSelect from '@/components/ui/DrawerSelect'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import { LOCATIONS, UNITS_GROUPED } from '@/lib/constants'

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
  const [qtyValues, setQtyValues] = useState<Record<string, number>>(
    Object.fromEntries(inventoryRows.map(r => [r.id, r.quantity]))
  )
  const [locationValues, setLocationValues] = useState<Record<string, string>>(
    Object.fromEntries(inventoryRows.map(r => [r.id, r.location]))
  )
  const [unitValues, setUnitValues] = useState<Record<string, string>>(
    Object.fromEntries(inventoryRows.map(r => [r.id, r.unit]))
  )
  const [lowThreshold, setLowThreshold] = useState(item.low_threshold)
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [manualLow, setManualLow] = useState(inventoryRows.some(r => r.manual_low_flag))
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  const mostRecent = rows.reduce<InventoryRow | null>((a, b) =>
    !a || b.updated_at > a.updated_at ? b : a, null)

  async function saveQty(rowId: string, val: number) {
    setQtyValues(v => ({ ...v, [rowId]: val }))
    const supabase = createClient()
    await supabase.from('inventory').update({ quantity: val, added_by: userId }).eq('id', rowId)
    setRows(rows.map(r => r.id === rowId ? { ...r, quantity: val } : r))
  }

  async function changeLocation(rowId: string, newLoc: string) {
    // Don't allow selecting a location already taken by another row for this item
    const taken = rows.filter(r => r.id !== rowId).map(r => r.location)
    if (taken.includes(newLoc)) return
    setLocationValues(v => ({ ...v, [rowId]: newLoc }))
    const supabase = createClient()
    await supabase.from('inventory').update({ location: newLoc }).eq('id', rowId)
    setRows(rows.map(r => r.id === rowId ? { ...r, location: newLoc } : r))
  }

  async function changeUnit(rowId: string, newUnit: string) {
    setUnitValues(v => ({ ...v, [rowId]: newUnit }))
    const supabase = createClient()
    await supabase.from('inventory').update({ unit: newUnit }).eq('id', rowId)
    setRows(rows.map(r => r.id === rowId ? { ...r, unit: newUnit } : r))
    // Also update the item's default unit to stay in sync
    await supabase.from('items').update({ default_unit: newUnit }).eq('id', item.id)
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

  const detailRow = (left: React.ReactNode, right: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  )

  const inputStyle = {
    background: 'oklch(100% 0 0 / 0.6)',
    borderColor: 'oklch(100% 0 0 / 0.5)',
    color: 'var(--foreground)',
  }

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

        {/* ── Stock per location ── */}
        {section('Stock')}

        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)', marginBottom: 20 }}>
            No stock recorded yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
            {rows.map((row, i) => {
              const takenLocations = rows.filter(r => r.id !== row.id).map(r => r.location)
              const currentLoc = locationValues[row.id] ?? row.location
              const currentUnit = unitValues[row.id] ?? row.unit
              const currentQty = qtyValues[row.id] ?? row.quantity

              return (
                <div key={row.id}>
                  {i > 0 && (
                    <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Location */}
                    {detailRow(
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Location</p>,
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {LOCATIONS.map(loc => {
                          const isCurrent = currentLoc === loc.value
                          const isTaken = takenLocations.includes(loc.value)
                          return (
                            <button
                              key={loc.value}
                              type="button"
                              onClick={() => changeLocation(row.id, loc.value)}
                              disabled={isTaken}
                              style={{
                                padding: '6px 12px', borderRadius: 99, fontSize: 12,
                                fontWeight: isCurrent ? 700 : 500,
                                cursor: isTaken ? 'not-allowed' : 'pointer',
                                opacity: isTaken ? 0.35 : 1,
                                border: isCurrent ? '2px solid var(--yellow)' : '1px solid var(--divider)',
                                background: isCurrent ? 'var(--yellow-light)' : 'var(--surface)',
                                color: isCurrent ? '#4A3300' : 'var(--foreground)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {loc.emoji} {loc.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Quantity */}
                    {detailRow(
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Quantity</p>,
                      <QuantityStepper value={currentQty} onChange={val => saveQty(row.id, val)} min={0} />
                    )}

                    {/* Unit */}
                    {detailRow(
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Unit</p>,
                      <div style={{ width: 160 }}>
                        <DrawerSelect
                          title="Unit"
                          value={currentUnit}
                          onChange={val => changeUnit(row.id, val)}
                          groups={Object.entries(UNITS_GROUPED).map(([label, units]) => ({
                            label,
                            options: units.map(u => ({ value: u, label: u })),
                          }))}
                          searchable
                        />
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Details ── */}
        {section('Details')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

          {detailRow(
            <>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Alert when below</p>
              <p className="text-11" style={{ color: 'var(--muted)' }}>
                Currently {lowThreshold} {rows[0]?.unit ?? ''}
              </p>
            </>,
            <QuantityStepper value={lowThreshold} onChange={saveThreshold} min={0} />
          )}

          {detailRow(
            <>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Mark as running low</p>
              <p className="text-11" style={{ color: 'var(--muted)' }}>
                Adds to shopping list regardless of quantity
              </p>
            </>,
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
          )}

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
              padding: '16px', borderRadius: 14,
              background: 'color-mix(in oklch, #EE1B49 10%, white 90%)',
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
