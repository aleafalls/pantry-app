'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import InventoryFilterBar, { DEFAULT_STOCK_FILTERS } from '@/components/inventory/InventoryFilterBar'
import InventoryItemRow from '@/components/inventory/InventoryItemRow'
import { LOCATIONS } from '@/lib/constants'
import AppBackground from '@/components/layout/AppBackground'
import PullToRefresh from '@/components/ui/PullToRefresh'

interface AggregatedItem {
  itemId: string
  name: string
  emoji: string | null
  category: string
  unit: string
  tags: string[]
  totalQty: number
  locations: string[]
  primaryLocation: string
  isLow: boolean
  isCritical: boolean
  stockStatus: 'out' | 'low' | 'full'
}

interface InventoryRow {
  id: string
  quantity: number
  unit: string
  location: string
  manual_low_flag: boolean
  items: {
    id: string
    name: string
    emoji: string | null
    category: string
    low_threshold: number
    active: boolean
    tags: string[] | null
  }
}

interface CatalogItem {
  id: string
  name: string
  emoji: string | null
  default_unit: string
  category: string
  default_location: string
  tags: string[]
}

export default function InventoryPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationFilters, setLocationFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [stockFilters, setStockFilters] = useState<string[]>(DEFAULT_STOCK_FILTERS)
  const [allItems, setAllItems] = useState<AggregatedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  // Load household id then inventory
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data }) => setHouseholdId(data?.household_id ?? null))
    })
  }, [])

  async function loadInventory(hid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('inventory')
      .select(`
        id, quantity, unit, location, manual_low_flag,
        items!inner(id, name, emoji, category, low_threshold, active, tags)
      `)
      .eq('household_id', hid)
      .eq('items.active', true)

    if (!data) { setLoading(false); return }

    // Aggregate by item_id
    const map = new Map<string, AggregatedItem>()
    for (const row of data as unknown as InventoryRow[]) {
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
          tags: item.tags ?? [],
          totalQty: row.quantity,
          locations: [row.location],
          primaryLocation: row.location,
          isLow: row.manual_low_flag,
          isCritical: false,
          stockStatus: 'full',
        })
      }
    }

    // Compute low/critical after full aggregation
    for (const [, agg] of map) {
      const threshold = (data as unknown as InventoryRow[]).find(r => r.items.id === agg.itemId)?.items.low_threshold ?? 2
      if (agg.totalQty === 0) agg.isCritical = true
      else if (agg.totalQty <= threshold) agg.isLow = true
      agg.stockStatus = agg.isCritical ? 'out' : agg.isLow ? 'low' : 'full'
    }

    setAllItems(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }

  useEffect(() => {
    if (!householdId) return
    loadInventory(householdId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadInventory is stable enough for this purpose; re-run only on householdId change
  }, [householdId])

  // Debounced catalog search — supplements the local pantry filter above with
  // matches from the global catalog, deduped against items already on hand.
  useEffect(() => {
    if (!query.trim()) {
      const clear = setTimeout(() => setCatalogItems([]), 0)
      return () => clearTimeout(clear)
    }

    const timer = setTimeout(async () => {
      setCatalogLoading(true)
      const supabase = createClient()
      const { data: catalog } = await supabase
        .from('catalog')
        .select('id, name, emoji, default_unit, category, default_location, tags')
        .ilike('name', `%${query.trim()}%`)
        .order('name')
        .limit(20)

      const ownedNames = new Set(allItems.map(i => i.name.toLowerCase()))
      setCatalogItems((catalog ?? []).filter(c => !ownedNames.has(c.name.toLowerCase())))
      setCatalogLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, allItems])

  // Unique tags across all items, for the Tags filter drawer
  const tagOptions = Array.from(new Set(allItems.flatMap(i => i.tags))).sort((a, b) => a.localeCompare(b))

  // Filter
  const filtered = allItems.filter(item => {
    const matchesSearch = !query || item.name.toLowerCase().includes(query.toLowerCase())
    const matchesLocation = locationFilters.length === 0 || locationFilters.some(loc => item.locations.includes(loc))
    const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(item.category)
    const matchesTags = tagFilters.length === 0 || tagFilters.some(tag => item.tags.includes(tag))
    const matchesStock = stockFilters.includes(item.stockStatus)
    return matchesSearch && matchesLocation && matchesCategory && matchesTags && matchesStock
  })

  // Group by primary location when no location filter is active
  const grouped = locationFilters.length === 0
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

        <div style={{ position: 'relative' }}>
          <Input
            type="text"
            placeholder="Search items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="rounded-xl pr-10 text-sm"
            style={{
              background: 'oklch(100% 0 0 / 0.7)',
              borderColor: 'oklch(100% 0 0 / 0.5)',
              color: 'var(--foreground)',
              padding: '10px 40px 10px 14px',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Clear search"
            >
              <i className="fi-rr-cross-small" style={{ display: 'block', fontSize: 18, lineHeight: 1, color: 'var(--muted)' }} />
            </button>
          )}
        </div>

        <InventoryFilterBar
          locationFilters={locationFilters}
          onLocationFiltersChange={setLocationFilters}
          categoryFilters={categoryFilters}
          onCategoryFiltersChange={setCategoryFilters}
          tagFilters={tagFilters}
          onTagFiltersChange={setTagFilters}
          tagOptions={tagOptions}
          stockFilters={stockFilters}
          onStockFiltersChange={setStockFilters}
        />
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={() => householdId ? loadInventory(householdId) : Promise.resolve()}>
      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 40 }}>{query ? '🔍' : '📦'}</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {query ? `No items matching "${query}" in your pantry` : 'No items in your pantry yet.'}
              </p>
            </div>
          ) : grouped ? (
            // Grouped by location
            grouped.map(({ loc, items }) => (
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
            ))
          ) : (
            // Flat filtered list
            filtered.map(item => (
              <InventoryItemRow
                key={item.itemId}
                {...item}
                onTap={() => router.push(`/inventory/${item.itemId}`)}
              />
            ))
          )}

          {/* Catalog matches + create-new — supplements the pantry list above,
              same "From catalog" / "Create" pattern as the Add screen. */}
          {query.trim() && (
            <>
              {catalogItems.length > 0 && (
                <>
                  <div style={{ padding: '12px 20px 4px' }}>
                    <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                      From catalog
                    </span>
                  </div>
                  {catalogItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const params = new URLSearchParams({
                          catalogId: item.id,
                          name: item.name,
                          category: item.category,
                          unit: item.default_unit,
                          location: item.default_location,
                        })
                        if (item.emoji) params.set('emoji', item.emoji)
                        if (item.tags?.length) params.set('tags', item.tags.join(','))
                        router.push(`/add/new?${params.toString()}`)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 20px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid var(--divider)',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1, width: 28, flexShrink: 0 }}>
                        {item.emoji ?? '📦'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                        <p className="text-11" style={{ color: 'var(--muted)' }}>{item.category}</p>
                      </div>
                      <Badge className="text-11 shrink-0" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--divider)' }}>
                        catalog
                      </Badge>
                    </button>
                  ))}
                </>
              )}

              {catalogLoading && (
                <div style={{ padding: '12px 20px' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Searching catalog…</p>
                </div>
              )}

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
                  background: 'var(--yellow-light)', color: '#4A3300',
                }}>
                  <i className="fi-rr-plus" style={{ fontSize: 12, display: 'block', lineHeight: 1 }} />
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Create &ldquo;{query.trim()}&rdquo;
                </span>
              </a>
            </>
          )}
        </>
      )}
      </PullToRefresh>
    </AppBackground>
  )
}
