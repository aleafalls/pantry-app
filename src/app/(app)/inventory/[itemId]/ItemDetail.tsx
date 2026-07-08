'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DrawerSelect from '@/components/ui/DrawerSelect'
import EmojiPicker from '@/components/ui/EmojiPicker'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import { LOCATIONS, UNITS_GROUPED, CATEGORIES } from '@/lib/constants'

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
  default_unit: string
  default_restock_qty: number | null
  preferred_stores: string[]
  tags: string[]
  auto_shopping_list: boolean | null
}

interface Props {
  item: Item
  inventoryRows: InventoryRow[]
  userId: string
}

function locationLabel(val: string) {
  return LOCATIONS.find(l => l.value === val)?.label ?? val
}

function locationEmoji(val: string) {
  return LOCATIONS.find(l => l.value === val)?.emoji ?? '📦'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ItemDetail({ item, inventoryRows, userId }: Props) {
  const router = useRouter()

  // ── Identity ──────────────────────────────────────────────
  const [nameValue, setNameValue] = useState(item.name)
  const [emojiValue, setEmojiValue] = useState(item.emoji ?? '📦')

  // ── Stock ─────────────────────────────────────────────────
  const [rows, setRows] = useState(inventoryRows)
  const primaryUnit = inventoryRows[0]?.unit ?? item.default_unit
  const currentTotal = rows.reduce((sum, r) => sum + r.quantity, 0)
  const [stockQty, setStockQty] = useState(currentTotal)  // absolute quantity on hand
  const [updating, setUpdating] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  // ── Item details ──────────────────────────────────────────
  const [unitValue, setUnitValue] = useState(primaryUnit)
  const [locationValues, setLocationValues] = useState<Record<string, string>>(
    Object.fromEntries(inventoryRows.map(r => [r.id, r.location]))
  )
  const [lowThreshold, setLowThreshold] = useState(item.low_threshold)
  const [tags, setTags] = useState<string[]>(item.tags ?? [])
  const [categoryValue, setCategoryValue] = useState(item.category)
  const [preferredStores, setPreferredStores] = useState<string[]>(item.preferred_stores ?? [])
  const [householdStores, setHouseholdStores] = useState<string[]>([])
  const [autoShoppingList, setAutoShoppingList] = useState(item.auto_shopping_list ?? true)
  const [addedToList, setAddedToList] = useState(false)
  const [shoppingQty, setShoppingQty] = useState<number | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  const mostRecent = rows.reduce<InventoryRow | null>((a, b) =>
    !a || b.updated_at > a.updated_at ? b : a, null)

  // ── Save functions ────────────────────────────────────────

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === item.name) return
    const supabase = createClient()
    await supabase.from('items').update({ name: trimmed }).eq('id', item.id)
  }

  async function saveEmoji(emoji: string) {
    setEmojiValue(emoji)
    const supabase = createClient()
    await supabase.from('items').update({ emoji }).eq('id', item.id)
  }

  async function handleUpdateStock() {
    setUpdating(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const isIncrease = stockQty > currentTotal  // only update purchase_date on genuine restock

    if (rows.length === 1) {
      // Simple case: one location — set directly
      await supabase.from('inventory').update({
        quantity: stockQty,
        added_by: userId,
        ...(isIncrease ? { purchase_date: today } : {}),
      }).eq('id', rows[0].id)
      setRows(rows.map(r => ({ ...r, quantity: stockQty })))
    } else {
      // Multiple locations: apply delta to the primary row (highest qty)
      const primaryRow = rows.reduce((a, b) => a.quantity >= b.quantity ? a : b)
      const delta = stockQty - currentTotal
      const adjustedQty = Math.max(0, primaryRow.quantity + delta)
      await supabase.from('inventory').update({
        quantity: adjustedQty,
        added_by: userId,
        ...(isIncrease ? { purchase_date: today } : {}),
      }).eq('id', primaryRow.id)
      setRows(rows.map(r => r.id === primaryRow.id ? { ...r, quantity: adjustedQty } : r))
    }

    // Resolve any pending shopping list entry now that stock is updated
    await supabase.from('shopping_list')
      .update({ status: 'purchased', completed_at: new Date().toISOString() })
      .eq('item_id', item.id).eq('status', 'pending')

    setJustUpdated(true)
    setUpdating(false)
    setTimeout(() => setJustUpdated(false), 2000)
  }

  async function changeUnit(newUnit: string) {
    setUnitValue(newUnit)
    const supabase = createClient()
    await supabase.from('items').update({ default_unit: newUnit }).eq('id', item.id)
    await supabase.from('inventory').update({ unit: newUnit }).eq('item_id', item.id)
    setRows(rows.map(r => ({ ...r, unit: newUnit })))
  }

  async function changeLocation(rowId: string, newLoc: string) {
    const taken = rows.filter(r => r.id !== rowId).map(r => r.location)
    if (taken.includes(newLoc)) return
    setLocationValues(v => ({ ...v, [rowId]: newLoc }))
    const supabase = createClient()
    await supabase.from('inventory').update({ location: newLoc }).eq('id', rowId)
    setRows(rows.map(r => r.id === rowId ? { ...r, location: newLoc } : r))
  }

  async function saveThreshold(val: number) {
    setLowThreshold(val)
    const supabase = createClient()
    await supabase.from('items').update({ low_threshold: val }).eq('id', item.id)

    // Sync shopping list only when auto-shopping is enabled
    if (!autoShoppingList) return
    if (currentTotal <= val) {
      const { count } = await supabase.from('shopping_list')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', item.id).eq('status', 'pending')
      if (!count) {
        await supabase.from('shopping_list').insert({
          household_id: item.household_id,
          item_id: item.id,
          item_name: nameValue,
          reason: 'auto',
          status: 'pending',
        })
      }
    } else {
      await supabase.from('shopping_list')
        .update({ status: 'cleared' })
        .eq('item_id', item.id).eq('status', 'pending').eq('reason', 'auto')
    }
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags)
    const supabase = createClient()
    await supabase.from('items').update({ tags: newTags }).eq('id', item.id)
  }

  // Load pending shopping list quantity for this item
  async function loadShoppingQty() {
    const supabase = createClient()
    const { data } = await supabase
      .from('shopping_list')
      .select('quantity')
      .eq('item_id', item.id)
      .eq('status', 'pending')
    const total = (data ?? []).reduce((sum, r) => sum + (r.quantity ?? 1), 0)
    setShoppingQty(total > 0 ? total : null)
  }

  useEffect(() => { loadShoppingQty() }, [])

  // Load household stores on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (!profile?.household_id) return
          supabase.from('stores').select('name').eq('household_id', profile.household_id)
            .order('name')
            .then(({ data }) => setHouseholdStores((data ?? []).map(s => s.name)))
        })
    })
  }, [])

  async function savePreferredStores(stores: string[]) {
    setPreferredStores(stores)
    const supabase = createClient()
    await supabase.from('items').update({ preferred_stores: stores }).eq('id', item.id)
  }

  async function addNewStore(name: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile?.household_id) return
    await supabase.from('stores').insert({ household_id: profile.household_id, name })
    setHouseholdStores(prev => [...prev, name].sort())
    // Also add to item's preferred stores
    await savePreferredStores([...preferredStores, name])
  }

  async function saveCategory(cat: string) {
    setCategoryValue(cat)
    const supabase = createClient()
    await supabase.from('items').update({ category: cat }).eq('id', item.id)
  }

  async function toggleAutoShopping() {
    const next = !autoShoppingList
    setAutoShoppingList(next)
    const supabase = createClient()
    await supabase.from('items').update({ auto_shopping_list: next }).eq('id', item.id)

    if (!next) {
      // Turning OFF — clear any pending auto entries
      await supabase.from('shopping_list')
        .update({ status: 'cleared' })
        .eq('item_id', item.id).eq('status', 'pending').eq('reason', 'auto')
    } else {
      // Turning ON — add to shopping list if currently below threshold
      if (currentTotal <= lowThreshold) {
        const { count } = await supabase.from('shopping_list')
          .select('id', { count: 'exact', head: true })
          .eq('item_id', item.id).eq('status', 'pending')
        if (!count) {
          await supabase.from('shopping_list').insert({
            household_id: item.household_id,
            item_id: item.id,
            item_name: nameValue,
            reason: 'auto',
            status: 'pending',
          })
        }
      }
    }
  }

  async function addToShoppingList() {
    const supabase = createClient()
    const { count } = await supabase.from('shopping_list')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', item.id).eq('status', 'pending')
    if (!count) {
      await supabase.from('shopping_list').insert({
        household_id: item.household_id,
        item_id: item.id,
        item_name: nameValue,
        reason: 'manual',
        status: 'pending',
        added_by: userId,
      })
    }
    setAddedToList(true)
    setTimeout(() => setAddedToList(false), 2000)
    loadShoppingQty()
  }

  async function removeItem() {
    setRemoving(true)
    const supabase = createClient()
    // Soft-delete the item and clear any pending shopping list entries
    await Promise.all([
      supabase.from('items').update({ active: false }).eq('id', item.id),
      supabase.from('shopping_list')
        .update({ status: 'cleared' })
        .eq('item_id', item.id)
        .eq('status', 'pending'),
    ])
    router.push('/inventory')
  }

  // ── Shared layout helpers ─────────────────────────────────

  const detailRow = (left: React.ReactNode, right: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <AppBackground>
      <PageHeader title="Update Item" backHref="/inventory" />

      <div style={{ padding: '20px 20px 0' }}>

        {/* ── Read-only item header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, fontSize: 26, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)',
          }}>
            {emojiValue}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p className="text-base font-extrabold truncate" style={{ color: 'var(--foreground)' }}>
                {nameValue}
              </p>
              {shoppingQty !== null && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                  background: 'var(--yellow-light)',
                  border: '1.5px solid var(--yellow)',
                  fontSize: 11, fontWeight: 700, color: '#4A3300',
                }}>
                  <i className="fi-rr-shopping-cart" style={{ fontSize: 10, display: 'block', lineHeight: 1 }} />
                  {shoppingQty}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              You have{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {currentTotal} {unitValue}
              </strong>
              {rows.length === 1
                ? <> in {locationEmoji(locationValues[rows[0].id] ?? rows[0].location)}{' '}
                    {locationLabel(locationValues[rows[0].id] ?? rows[0].location)}</>
                : <> across {rows.length} locations</>
              }
            </p>
          </div>
        </div>

        {/* ── Stock ── */}
        {sectionLabel('Stock')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: showDetails ? 16 : 0 }}>

          {/* Qty stepper */}
          {detailRow(
            <Label>Quantity on hand</Label>,
            <QuantityStepper value={stockQty} onChange={setStockQty} min={0} />
          )}

          {/* Update stock button */}
          <Button
            variant="brand"
            onClick={handleUpdateStock}
            disabled={updating}
            style={{
              background: justUpdated
                ? 'var(--surface)'
                : 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: justUpdated ? 'var(--foreground)' : '#4A3300',
              padding: '14px 16px',
              transition: 'all 0.3s',
            }}
          >
            {updating ? 'Saving…' : justUpdated ? '✓ Updated!' : 'Update Stock'}
          </Button>

          {/* Add to List + Cook with — side by side */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={addToShoppingList}
              style={{
                flex: 1, padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid var(--divider)', background: 'var(--surface)',
                color: addedToList ? 'var(--teal)' : 'var(--foreground)',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'color 0.2s',
              }}
            >
              <i
                className={addedToList ? 'fi-sr-check' : 'fi-sr-shopping-cart-check'}
                style={{ fontSize: 15, display: 'block', lineHeight: 1 }}
              />
              {addedToList ? 'Added!' : 'Add to List'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/chef')}
              style={{
                flex: 1, padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid var(--divider)', background: 'var(--surface)',
                color: 'var(--foreground)',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <i className="fi-sr-user-chef" style={{ fontSize: 15, display: 'block', lineHeight: 1 }} />
              Cook with
            </button>
          </div>

          {/* Show / Hide Item Details — same gap as other elements */}
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1.5px solid var(--divider)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <i
              className={showDetails ? 'fi-rr-angle-up' : 'fi-rr-angle-down'}
              style={{ fontSize: 13, display: 'block', lineHeight: 1 }}
            />
            {showDetails ? 'Hide Item Details' : 'Show Item Details'}
          </button>
        </div>

        {showDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Editable name + emoji inline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Input
                    type="text"
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="font-extrabold text-lg flex-1"
                    style={{ color: 'var(--foreground)' }}
                  />
                  <EmojiPicker value={emojiValue} onChange={saveEmoji} />
                </div>

                {detailRow(
                  <Label>Unit</Label>,
                  <DrawerSelect
                    title="Unit"
                    value={unitValue}
                    onChange={changeUnit}
                    groups={Object.entries(UNITS_GROUPED).map(([label, units]) => ({
                      label,
                      options: units.map(u => ({ value: u, label: u })),
                    }))}
                    searchable
                  />
                )}

                {rows.map((row, i) => {
                  const takenLocations = rows.filter(r => r.id !== row.id).map(r => r.location)
                  const currentLoc = locationValues[row.id] ?? row.location
                  return (
                    <div key={row.id}>
                      {detailRow(
                        <Label>{rows.length > 1 ? `Location ${i + 1}` : 'Location'}</Label>,
                        <DrawerSelect
                          title="Location"
                          value={currentLoc}
                          onChange={val => changeLocation(row.id, val)}
                          chipTrigger
                          disabledValues={takenLocations}
                          options={LOCATIONS.map(l => ({ value: l.value, label: `${l.emoji} ${l.label}` }))}
                        />
                      )}
                    </div>
                  )
                })}

                {detailRow(
                  <Label>Auto add to shopping list</Label>,
                  <button
                    onClick={toggleAutoShopping}
                    style={{
                      width: 48, height: 28, borderRadius: 99, flexShrink: 0,
                      background: autoShoppingList ? 'var(--yellow)' : 'var(--divider)',
                      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: autoShoppingList ? 23 : 3,
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                )}

                {detailRow(
                  <Label>Auto add when below</Label>,
                  <QuantityStepper value={lowThreshold} onChange={saveThreshold} min={0} />
                )}


                {detailRow(
                  <Label>Category</Label>,
                  <DrawerSelect
                    title="Category"
                    value={categoryValue}
                    onChange={saveCategory}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                )}

                {detailRow(
                  <Label>Preferred stores</Label>,
                  <DrawerSelect
                    title="Preferred Stores"
                    multiple
                    values={preferredStores}
                    onChangeMultiple={savePreferredStores}
                    placeholder="Add stores…"
                    options={householdStores.map(s => ({ value: s, label: s }))}
                    onAddNew={addNewStore}
                    addNewPlaceholder="Add a store…"
                  />
                )}

                <div>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Tags</Label>
                  <TagInput tags={tags} onChange={saveTags} />
                </div>

                {mostRecent && (
                  <p className="text-11" style={{ color: 'var(--muted)' }}>
                    Last updated {formatDate(mostRecent.updated_at)}
                  </p>
                )}

                {/* Actions inside accordion */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
                  <Button
                    variant="brand"
                    onClick={() => router.push('/inventory')}
                    style={{
                      background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                      color: '#4A3300', padding: '14px 16px',
                    }}
                  >
                    Save Item
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
                        Remove {nameValue} from your pantry?
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
        )}
      </div>
    </AppBackground>
  )
}
