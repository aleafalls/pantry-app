'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import QuantityStepper from '@/components/add/QuantityStepper'
import LocationSelector from '@/components/add/LocationSelector'

interface CatalogItem {
  id: string
  name: string
  emoji: string | null
  default_unit: string
  default_location: string
  category: string
  tags: string[]
}

interface Props {
  catalogItem: CatalogItem
  householdId: string
  userId: string
}

export default function CatalogRestockForm({ catalogItem, householdId, userId }: Props) {
  const router = useRouter()
  const [addedQty, setAddedQty] = useState(1)
  const [location, setLocation] = useState(catalogItem.default_location)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const itemId = crypto.randomUUID()
    const today = new Date().toISOString().split('T')[0]

    // Create the item row first
    const { error: itemError } = await supabase.from('items').insert({
      id: itemId,
      household_id: householdId,
      name: catalogItem.name,
      category: catalogItem.category,
      default_unit: catalogItem.default_unit,
      default_restock_qty: addedQty,
      emoji: catalogItem.emoji,
      low_threshold: 2,
      tags: catalogItem.tags ?? [],
      catalog_id: catalogItem.id,
      active: true,
    })

    if (itemError) { setError(itemError.message); setLoading(false); return }

    // Then create the inventory row
    const { error: invError } = await supabase.from('inventory').insert({
      household_id: householdId,
      item_id: itemId,
      location,
      quantity: addedQty,
      unit: catalogItem.default_unit,
      purchase_date: today,
      added_by: userId,
    })

    if (invError) { setError(invError.message); setLoading(false); return }

    // Route to the unified inventory detail page for the new item
    router.push(`/inventory/${itemId}`)
  }

  return (
    <AppBackground>

      <PageHeader title="Add to pantry" backHref="/add" />

      <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', flexShrink: 0,
          }}>
            {catalogItem.emoji ?? '📦'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{catalogItem.name}</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{catalogItem.category}</p>
          </div>
        </div>

        <QuantityStepper value={addedQty} onChange={setAddedQty} label="How many are you adding?" />
        <LocationSelector value={location} onChange={setLocation} />

        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            You&apos;ll have <strong>{addedQty} {catalogItem.default_unit}</strong> in your pantry
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

        <Button type="submit" variant="brand" disabled={loading}
          style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', marginTop: 8 }}>
          {loading ? 'Adding…' : 'Add to pantry'}
        </Button>
      </form>
    </AppBackground>
  )
}
