'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import LocationFilter from '@/components/inventory/LocationFilter'
import InventoryItemRow from '@/components/inventory/InventoryItemRow'
import { LOCATIONS } from '@/lib/constants'
import AppBackground from '@/components/layout/AppBackground'

interface AggregatedItem {
  itemId: string
  name: string
  emoji: string | null
  category: string
  unit: string
  totalQty: number
  locations: string[]
  primaryLocation: string
  isLow: boolean
  isCritical: boolean
}

export default function InventoryPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [allItems, setAllItems] = useState<AggregatedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  // Load household id then inventory
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data }) => setHouseholdId(data?.household_id ?? null))
    })
  }, [])

  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()
    supabase
      .from('inventory')
      .select(`
        id, quantity, unit, location, manual_low_flag,
        items!inner(id, name, emoji, category, low_threshold, active)
      `)
      .eq('household_id', householdId)
      .eq('items.active', true)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }

        // Aggregate by item_id
        const map = new Map<string, AggregatedItem>()
        for (const row of data as any[]) {
          const item = row.items
          const existing = map.get(item.id)
          if (existing) {
            existing.totalQty += row.quantity
            if (!existing.locations.includes(row.location)) {
              existing.locations.push(row.location)
            }
            if (row.manual_low_flag) existing.isLow = true
          } else {
            map.set(item.id, {
              itemId: item.id,
              name: item.name,
              emoji: item.emoji,
              category: item.category,
              unit: row.unit,
              totalQty: row.quantity,
              locations: [row.location],
              primaryLocation: row.location,
              isLow: row.manual_low_flag,
              isCritical: false,
            })
          }
        }

        // Compute low/critical after full aggregation
        for (const [, agg] of map) {
          const threshold = (data as any[]).find((r: any) => r.items.id === agg.itemId)?.items.low_threshold ?? 2
          if (agg.totalQty === 0) agg.isCritical = true
          else if (agg.totalQty <= threshold) agg.isLow = true
        }

        setAllItems(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)))
        setLoading(false)
      })
  }, [householdId])

  // Filter
  const filtered = allItems.filter(item => {
    const matchesSearch = !query || item.name.toLowerCase().includes(query.toLowerCase())
    const matchesLocation = locationFilter === 'all' || item.locations.includes(locationFilter)
    return matchesSearch && matchesLocation
  })

  // Group by primary location when "All" selected
  const grouped = locationFilter === 'all'
    ? LOCATIONS.map(loc => ({
        loc,
        items: filtered.filter(i => i.primaryLocation === loc.value),
      })).filter(g => g.items.length > 0)
    : null

  return (
    <AppBackground>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '16px 20px 12px',
        background: 'oklch(99% 0.003 85 / 0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.4)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <h1 className="text-base font-extrabold text-center" style={{ color: 'var(--foreground)' }}>
          Inventory
        </h1>

        <Input
          type="text"
          placeholder="Search items…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="rounded-xl text-sm"
          style={{
            background: 'oklch(100% 0 0 / 0.7)',
            borderColor: 'oklch(100% 0 0 / 0.5)',
            color: 'var(--foreground)',
            padding: '10px 14px',
          }}
        />

        <LocationFilter value={locationFilter} onChange={setLocationFilter} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40 }}>📦</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {query ? `No items matching "${query}"` : 'No items in your pantry yet.'}
          </p>
          {query.trim() && (
            <a
              href={`/add/new?name=${encodeURIComponent(query.trim())}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 99,
                background: 'var(--yellow-light)', border: '2px solid var(--yellow)',
                color: '#4A3300', fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>+</span>
              Add &ldquo;{query.trim()}&rdquo; to pantry
            </a>
          )}
        </div>
      ) : grouped ? (
        // Grouped by location
        <>
          {grouped.map(({ loc, items }) => (
            <div key={loc.value}>
              <div style={{ padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                  {loc.emoji} {loc.label}
                </span>
              </div>
              {items.map(item => (
                <InventoryItemRow
                  key={item.itemId}
                  {...item}
                  onTap={() => router.push(`/inventory/${item.itemId}`)}
                />
              ))}
            </div>
          ))}
          {query.trim() && (
            <a
              href={`/add/new?name=${encodeURIComponent(query.trim())}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 20px',
                borderTop: '1px solid var(--divider)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--yellow-light)', fontSize: 14, fontWeight: 700, color: '#4A3300',
              }}>+</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Add &ldquo;{query.trim()}&rdquo; to pantry
              </span>
            </a>
          )}
        </>
      ) : (
        // Flat filtered list
        <>
          {filtered.map(item => (
            <InventoryItemRow
              key={item.itemId}
              {...item}
              onTap={() => router.push(`/inventory/${item.itemId}`)}
            />
          ))}
          {query.trim() && (
            <a
              href={`/add/new?name=${encodeURIComponent(query.trim())}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 20px',
                borderTop: '1px solid var(--divider)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--yellow-light)', fontSize: 14, fontWeight: 700, color: '#4A3300',
              }}>+</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Add &ldquo;{query.trim()}&rdquo; to pantry
              </span>
            </a>
          )}
        </>
      )}
    </AppBackground>
  )
}
