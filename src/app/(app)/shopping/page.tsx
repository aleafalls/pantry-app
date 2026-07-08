'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'

interface ShoppingItem {
  id: string
  item_id: string | null
  item_name: string
  reason: 'auto' | 'manual' | 'recipe'
  status: 'pending' | 'purchased' | 'cleared'
  added_by: string | null
  store: string | null
  quantity: number | null
  items?: {
    emoji: string | null
    preferred_stores: string[]
    default_restock_qty: number | null
    default_unit: string | null
  } | null
}

interface Store { name: string }

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [storeFilter, setStoreFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; emoji: string | null; default_unit: string | null; default_restock_qty: number | null }[]>([])
  const [searchFocused, setSearchFocused] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [resyncing, setResyncing] = useState(false)
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles')
        .select('household_id, display_name').eq('id', user.id).single()
      if (!profile?.household_id) return
      setHouseholdId(profile.household_id)
      setDisplayName(profile.display_name ?? '')
      await loadData(profile.household_id, supabase)
      subscribeRealtime(profile.household_id, supabase)
    })
    // removeChannel fully deregisters from the client — unsubscribe() alone leaves
    // the channel in the registry, causing "cannot add callbacks after subscribe()" on remount
    return () => {
      if (realtimeRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(realtimeRef.current)
      }
    }
  }, [])

  // Debounced inventory search
  useEffect(() => {
    if (!searchQuery.trim() || !householdId) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('items')
        .select('id, name, emoji, default_unit, default_restock_qty')
        .eq('household_id', householdId)
        .eq('active', true)
        .ilike('name', `%${searchQuery}%`)
        .order('name')
        .limit(8)
      setSearchResults(data ?? [])
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, householdId])

  async function loadData(hid: string, supabase: ReturnType<typeof createClient>) {
    const [{ data: listItems }, { data: storeRows }] = await Promise.all([
      supabase.from('shopping_list')
        .select('id, item_id, item_name, reason, status, added_by, store, quantity, items(emoji, preferred_stores, default_restock_qty, default_unit)')
        .eq('household_id', hid)
        .neq('status', 'cleared')
        .order('added_at', { ascending: true }),
      supabase.from('stores').select('name').eq('household_id', hid).order('name'),
    ])
    const typed = (listItems ?? []) as ShoppingItem[]
    setItems(typed)
    // Initialise quantity map: prefer saved quantity → item default → 1
    setQuantities(prev => {
      const next = { ...prev }
      for (const item of typed) {
        if (!(item.id in next)) {
          next[item.id] = item.quantity ?? item.items?.default_restock_qty ?? 1
        }
      }
      return next
    })
    setStores((storeRows ?? []) as Store[])
    setLoading(false)
  }

  async function resyncShoppingList() {
    if (!householdId) return
    setResyncing(true)
    const supabase = createClient()

    // Fetch all active inventory with item thresholds
    const { data: inventory } = await supabase
      .from('inventory')
      .select('item_id, quantity, manual_low_flag, items!inner(id, name, low_threshold, active)')
      .eq('household_id', householdId)
      .eq('items.active', true)

    if (inventory) {
      // Aggregate quantities per item
      const itemMap = new Map<string, { name: string; total: number; threshold: number; manualLow: boolean }>()
      for (const row of inventory as any[]) {
        const ex = itemMap.get(row.item_id)
        if (ex) {
          ex.total += row.quantity
          ex.manualLow = ex.manualLow || row.manual_low_flag
        } else {
          itemMap.set(row.item_id, {
            name: row.items.name,
            total: row.quantity,
            threshold: row.items.low_threshold,
            manualLow: row.manual_low_flag,
          })
        }
      }

      // Get currently pending item_ids so we don't duplicate
      const { data: pending } = await supabase
        .from('shopping_list')
        .select('item_id')
        .eq('household_id', householdId)
        .eq('status', 'pending')

      const pendingIds = new Set((pending ?? []).map((i: any) => i.item_id).filter(Boolean))

      // Insert entries for items that are low but not on the list
      const toAdd = []
      for (const [itemId, data] of itemMap) {
        if ((data.total <= data.threshold || data.manualLow) && !pendingIds.has(itemId)) {
          toAdd.push({
            household_id: householdId,
            item_id: itemId,
            item_name: data.name,
            reason: 'auto',
            status: 'pending',
          })
        }
      }

      if (toAdd.length > 0) {
        await supabase.from('shopping_list').insert(toAdd)
      }
    }

    await loadData(householdId, supabase)
    setResyncing(false)
  }

  function subscribeRealtime(hid: string, supabase: ReturnType<typeof createClient>) {
    // Unique channel name per mount so React Strict Mode's double-invoke
    // never collides with a channel that is already subscribed
    const channelName = `shopping-${hid}-${Math.random().toString(36).slice(2)}`
    realtimeRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shopping_list',
        filter: `household_id=eq.${hid}`,
      }, () => loadData(hid, supabase))
      .subscribe()
  }

  // Filter logic
  const visibleItems = items.filter(item => {
    if (storeFilter === 'all') return true
    if (item.store === storeFilter) return true
    if (item.items?.preferred_stores?.includes(storeFilter)) return true
    return false
  })

  const pending = visibleItems.filter(i => i.status === 'pending')
  const purchased = visibleItems.filter(i => i.status === 'purchased')
  const autoPending = pending.filter(i => i.reason === 'auto')
  const manualPending = pending.filter(i => i.reason === 'manual')

  async function checkOff(item: ShoppingItem) {
    const qty = quantities[item.id] ?? 1
    const supabase = createClient()

    // Mark purchased and save the quantity used
    await supabase.from('shopping_list')
      .update({ status: 'purchased', quantity: qty })
      .eq('id', item.id)

    // Update inventory if this is a tracked item
    if (item.item_id) {
      const today = new Date().toISOString().split('T')[0]
      const { data: invRows } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_id', item.item_id)
        .order('quantity', { ascending: false })

      if (invRows && invRows.length > 0) {
        await supabase.from('inventory').update({
          quantity: invRows[0].quantity + qty,
          purchase_date: today,
          added_by: userId,
        }).eq('id', invRows[0].id)
      }

      // Remember this quantity as the new default
      await supabase.from('items')
        .update({ default_restock_qty: qty })
        .eq('id', item.item_id)
    }

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'purchased' } : i))
  }

  async function uncheck(item: ShoppingItem) {
    const supabase = createClient()
    await supabase.from('shopping_list').update({ status: 'pending' }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i))
  }

  async function clearCompleted() {
    const supabase = createClient()
    const ids = purchased.map(i => i.id)
    await supabase.from('shopping_list').update({ status: 'cleared' }).in('id', ids)
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults([])
    setSearchFocused(false)
  }

  async function addFromInventory(result: typeof searchResults[0]) {
    if (!householdId) return
    // Don't duplicate if already pending
    const alreadyPending = items.some(i => i.item_id === result.id && i.status === 'pending')
    if (alreadyPending) { clearSearch(); return }
    const supabase = createClient()
    await supabase.from('shopping_list').insert({
      household_id: householdId,
      item_id: result.id,
      item_name: result.name,
      quantity: result.default_restock_qty ?? 1,
      reason: 'manual',
      status: 'pending',
      added_by: userId,
      store: storeFilter !== 'all' ? storeFilter : null,
    })
    clearSearch()
  }

  async function addManualText() {
    const name = searchQuery.trim()
    if (!name || !householdId) return
    const supabase = createClient()
    await supabase.from('shopping_list').insert({
      household_id: householdId,
      item_name: name,
      reason: 'manual',
      status: 'pending',
      added_by: userId,
      store: storeFilter !== 'all' ? storeFilter : null,
    })
    clearSearch()
  }

  const CountBadge = ({ count }: { count: number }) => (
    <span style={{
      fontSize: 10, fontWeight: 700, color: 'var(--muted)',
      background: 'var(--surface)', border: '1px solid var(--divider)',
      borderRadius: 99, padding: '1px 6px', lineHeight: '14px',
    }}>
      {count}
    </span>
  )

  const ItemRow = ({ item, checked }: { item: ShoppingItem; checked: boolean }) => {
    const qty = quantities[item.id] ?? 1
    const unit = item.items?.default_unit ?? ''

    function updateQty(delta: number) {
      const next = Math.max(1, qty + delta)
      setQuantities(prev => ({ ...prev, [item.id]: next }))
      // Persist to DB without awaiting (fire and forget)
      createClient().from('shopping_list').update({ quantity: next }).eq('id', item.id)
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px',
        borderBottom: '1px solid var(--divider)',
        opacity: checked ? 0.45 : 1,
      }}>
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => checked ? uncheck(item) : checkOff(item)}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            border: checked ? 'none' : '1.5px solid var(--divider)',
            background: checked ? 'var(--yellow)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {checked && <i className="fi-rr-check" style={{ fontSize: 11, display: 'block', lineHeight: 1, color: '#4A3300' }} />}
        </button>

        {/* Emoji */}
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
          {item.items?.emoji ?? '🛒'}
        </span>

        {/* Name + auto indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Link
            href={item.item_id
              ? `/inventory/${item.item_id}`
              : `/add/new?name=${encodeURIComponent(item.item_name)}&shoppingListId=${item.id}`}
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--foreground)', textDecoration: checked ? 'line-through' : 'none' }}
          >
            {item.item_name}
          </Link>
          {item.reason === 'auto' && !checked && (
            <i className="fi-rr-arrows-repeat" style={{ fontSize: 12, display: 'block', lineHeight: 1, color: 'var(--muted)', flexShrink: 0 }} />
          )}
        </div>

        {/* Compact qty stepper — fixed width so all rows align */}
        {!checked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, width: 104 }}>
            <button
              type="button"
              onClick={() => updateQty(-1)}
              style={{
                width: 26, height: 26, borderRadius: '8px 0 0 8px',
                border: '1px solid oklch(100% 0 0 / 0.5)', borderRight: 'none',
                background: 'lab(99 0.1 1.08)', color: 'var(--foreground)',
                fontSize: 15, fontWeight: 600, cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                opacity: qty <= 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <div style={{
              flex: 1, height: 26, padding: '0 4px', overflow: 'hidden',
              borderTop: '1px solid oklch(100% 0 0 / 0.5)', borderBottom: '1px solid oklch(100% 0 0 / 0.5)',
              background: 'lab(99 0.1 1.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap',
            }}>
              {qty}{unit ? ` ${unit}` : ''}
            </div>
            <button
              type="button"
              onClick={() => updateQty(1)}
              style={{
                width: 26, height: 26, borderRadius: '0 8px 8px 0',
                border: '1px solid oklch(100% 0 0 / 0.5)', borderLeft: 'none',
                background: 'lab(99 0.1 1.08)', color: 'var(--foreground)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppBackground>

      <PageHeader
        title="Shopping List"
        rightAction={
          <button
            onClick={resyncShoppingList}
            disabled={resyncing}
            aria-label="Refresh shopping list"
            style={{
              background: 'none', border: 'none', cursor: resyncing ? 'wait' : 'pointer',
              color: 'var(--muted)', padding: 0, display: 'flex', alignItems: 'center',
              opacity: resyncing ? 0.4 : 1,
            }}
          >
            <i className="fi-rr-rotate-right" style={{ fontSize: 18, display: 'block', lineHeight: 1, animation: resyncing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        }
      >
        {/* Store filter pills */}
        {stores.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {[{ name: 'all', label: 'All' }, ...stores.map(s => ({ name: s.name, label: s.name }))].map(s => {
              const isActive = storeFilter === s.name
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setStoreFilter(s.name)}
                  style={{
                    flexShrink: 0, padding: '7px 14px', borderRadius: 99, fontSize: 13,
                    fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
                    border: isActive ? '2px solid var(--yellow)' : '1px solid var(--divider)',
                    background: isActive ? 'var(--yellow-light)' : 'var(--surface)',
                    color: isActive ? '#4A3300' : 'var(--foreground)',
                    fontFamily: 'inherit',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        )}
      </PageHeader>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      ) : (
        <>
          {/* Auto section */}
          {autoPending.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>Running low</span>
                <CountBadge count={autoPending.length} />
              </div>
              {autoPending.map(item => <ItemRow key={item.id} item={item} checked={false} />)}
            </div>
          )}

          {/* Manual section */}
          {manualPending.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>Added</span>
                <CountBadge count={manualPending.length} />
              </div>
              {manualPending.map(item => <ItemRow key={item.id} item={item} checked={false} />)}
            </div>
          )}

          {/* Empty state */}
          {pending.length === 0 && purchased.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)', marginBottom: 4 }}>
                You&apos;re all stocked up
              </p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Items running low will appear here automatically.
              </p>
            </div>
          )}

          {/* Completed section */}
          {purchased.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>Done</span>
                <CountBadge count={purchased.length} />
                <button
                  onClick={clearCompleted}
                  style={{
                    marginLeft: 'auto', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 11, fontWeight: 700, color: 'var(--amber)',
                  }}
                >
                  Clear Done
                </button>
              </div>
              {purchased.map(item => <ItemRow key={item.id} item={item} checked />)}
            </div>
          )}
        </>
      )}

      {/* Search / add bar — pinned above bottom nav */}
      <div style={{
        position: 'fixed',
        bottom: 88,
        left: 'max(20px, calc(50% - 310px))',
        right: 'max(20px, calc(50% - 310px))',
        zIndex: 40,
      }}>
        {/* Results panel — floats above the bar when there's a query */}
        {searchFocused && searchQuery.trim().length > 0 && (
          <div
            className="no-scrollbar"
            style={{
              background: 'oklch(97% 0.006 85)',
              borderRadius: 16, marginBottom: 8,
              boxShadow: '0 8px 24px -4px oklch(30% 0.02 85 / 0.25)',
              border: '1px solid oklch(100% 0 0 / 0.5)',
              overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
            }}
          >
            {/* Inventory matches */}
            {searchResults.length > 0 && (
              <>
                <div style={{ padding: '10px 16px 4px' }}>
                  <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                    Your inventory
                  </span>
                </div>
                {searchResults.map(result => {
                  const alreadyPending = items.some(i => i.item_id === result.id && i.status === 'pending')
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()} // prevent blur before tap
                      onClick={() => addFromInventory(result)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '11px 16px',
                        background: 'none', border: 'none',
                        borderBottom: '1px solid var(--divider)',
                        cursor: alreadyPending ? 'default' : 'pointer',
                        textAlign: 'left', opacity: alreadyPending ? 0.4 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{result.emoji ?? '📦'}</span>
                      <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--foreground)' }}>
                        {result.name}
                      </span>
                      {alreadyPending && (
                        <span className="text-11" style={{ color: 'var(--muted)', flexShrink: 0 }}>on list</span>
                      )}
                    </button>
                  )
                })}
              </>
            )}

            {/* Manual add option */}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={addManualText}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--yellow-light)', fontSize: 14, fontWeight: 700, color: '#4A3300',
              }}>+</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Add &ldquo;{searchQuery.trim()}&rdquo; to list
              </span>
            </button>
          </div>
        )}

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'oklch(97% 0.006 85)',
          borderRadius: 16, padding: 8,
          boxShadow: '0 4px 20px -4px oklch(30% 0.02 85 / 0.2)',
          border: '1px solid oklch(100% 0 0 / 0.5)',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i className="fi-rr-search" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, display: 'block', lineHeight: 1, color: 'var(--muted)',
            }} />
            <Input
              type="text"
              placeholder={storeFilter !== 'all' ? `Search or add to ${storeFilter} list…` : 'Search or add an item…'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={e => e.key === 'Enter' && addManualText()}
              className="rounded-xl text-sm"
              style={{
                background: 'oklch(100% 0 0 / 0.6)',
                borderColor: 'oklch(100% 0 0 / 0.5)',
                color: 'var(--foreground)',
                padding: '10px 12px 10px 34px',
              }}
            />
          </div>
        </div>
      </div>
    </AppBackground>
  )
}
