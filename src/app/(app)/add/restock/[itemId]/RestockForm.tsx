'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import QuantityStepper from '@/components/add/QuantityStepper'
import LocationSelector from '@/components/add/LocationSelector'
import SuccessScreen from '@/components/add/SuccessScreen'

const LOCATION_LABELS: Record<string, string> = {
  pantry: 'Pantry', fridge: 'Fridge', freezer: 'Freezer', spice_rack: 'Spice Rack',
}

interface InventoryRow {
  id: string
  location: string
  quantity: number
  unit: string
}

interface Item {
  id: string
  name: string
  emoji: string | null
  default_unit: string
  default_restock_qty: number | null
  household_id: string
}

interface Props {
  item: Item
  inventoryRows: InventoryRow[]
  userId: string
}

export default function RestockForm({ item, inventoryRows, userId }: Props) {
  const defaultLocation = inventoryRows.length > 0
    ? inventoryRows.reduce((a, b) => a.quantity >= b.quantity ? a : b).location
    : 'pantry'

  const [addedQty, setAddedQty] = useState(item.default_restock_qty ?? 1)
  const [location, setLocation] = useState(defaultLocation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const currentTotal = inventoryRows.reduce((sum, r) => sum + r.quantity, 0)
  const newTotal = currentTotal + addedQty
  const unit = inventoryRows[0]?.unit ?? item.default_unit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const existingRow = inventoryRows.find(r => r.location === location)

    let err
    if (existingRow) {
      const { error } = await supabase.from('inventory').update({
        quantity: existingRow.quantity + addedQty,
        purchase_date: today,
        added_by: userId,
      }).eq('id', existingRow.id)
      err = error
    } else {
      const { error } = await supabase.from('inventory').insert({
        household_id: item.household_id,
        item_id: item.id,
        location,
        quantity: addedQty,
        unit,
        purchase_date: today,
        added_by: userId,
      })
      err = error
    }

    if (err) { setError(err.message); setLoading(false); return }

    // Remember qty for next restock
    await supabase.from('items').update({ default_restock_qty: addedQty }).eq('id', item.id)

    // Resolve any pending shopping list entry
    await supabase.from('shopping_list')
      .update({ status: 'purchased', completed_at: new Date().toISOString() })
      .eq('item_id', item.id)
      .eq('status', 'pending')

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>
        <SuccessScreen
          itemName={item.name}
          detail={`You now have ${newTotal} ${unit} total`}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'oklch(99% 0.003 85 / 0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.4)',
      }}>
        <Link href="/add" style={{ color: 'var(--muted)', fontSize: 20, textDecoration: 'none', flexShrink: 0 }}>←</Link>
        <h1 className="text-base font-extrabold truncate" style={{ color: 'var(--foreground)' }}>
          Restock
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Item identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', flexShrink: 0,
          }}>
            {item.emoji ?? '📦'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{item.name}</h2>
            {inventoryRows.length > 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Currently: {currentTotal} {unit}
                {inventoryRows.length > 1
                  ? ` across ${inventoryRows.length} locations`
                  : ` in ${LOCATION_LABELS[inventoryRows[0].location] ?? inventoryRows[0].location}`}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Not yet in your pantry</p>
            )}
          </div>
        </div>

        {/* Qty stepper */}
        <QuantityStepper value={addedQty} onChange={setAddedQty} label="How many are you adding?" />

        {/* Location */}
        <LocationSelector value={location} onChange={setLocation} />

        {/* Running total preview */}
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            After adding, you&apos;ll have{' '}
            <strong>{newTotal} {unit}</strong> total
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

        <Button type="submit" variant="brand" disabled={loading}
          style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', marginTop: 8 }}>
          {loading ? 'Adding…' : 'Add to pantry'}
        </Button>
      </form>
    </div>
  )
}
