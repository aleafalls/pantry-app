'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import QuantityStepper from '@/components/add/QuantityStepper'
import LocationSelector from '@/components/add/LocationSelector'
import { LOCATIONS } from '@/lib/constants'

const LOCATION_LABELS: Record<string, string> = Object.fromEntries(LOCATIONS.map(l => [l.value, l.label]))

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
  const router = useRouter()
  const defaultLocation = inventoryRows.length > 0
    ? inventoryRows.reduce((a, b) => a.quantity >= b.quantity ? a : b).location
    : 'pantry'

  const [addedQty, setAddedQty] = useState(item.default_restock_qty ?? 1)
  const [location, setLocation] = useState(defaultLocation)
  const [loading, setLoading] = useState(false)

  const currentTotal = inventoryRows.reduce((sum, r) => sum + r.quantity, 0)
  const newTotal = currentTotal + addedQty
  const unit = inventoryRows[0]?.unit ?? item.default_unit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const existingRow = inventoryRows.find(r => r.location === location)

    const savePromise = (async () => {
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

      if (err) throw new Error(err.message)

      // Remember qty for next restock
      await supabase.from('items').update({ default_restock_qty: addedQty }).eq('id', item.id)

      // Resolve any pending shopping list entry
      await supabase.from('shopping_list')
        .update({ status: 'purchased', completed_at: new Date().toISOString() })
        .eq('item_id', item.id)
        .eq('status', 'pending')
    })()

    toast.promise(savePromise, {
      loading: `Adding ${item.name}…`,
      success: () => ({
        message: `${item.name} added!`,
        description: `You now have ${newTotal} ${unit} total`,
        action: { label: 'View item', onClick: () => router.push(`/inventory/${item.id}`) },
      }),
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      await savePromise
      router.push('/add')
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppBackground>

      <PageHeader title="Restock" backHref="/add" />

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

        <Button type="submit" variant="brand" disabled={loading}
          style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', marginTop: 8 }}>
          {loading ? 'Adding…' : 'Add to pantry'}
        </Button>
      </form>
    </AppBackground>
  )
}
