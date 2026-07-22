'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import SwipeActionRow from '@/components/ui/SwipeActionRow'
import ReceiptItemRow from '@/components/add/ReceiptItemRow'
import { takeReceiptImportDraft, type MatchedReceiptItem, type UnmatchedReceiptItem } from '@/lib/receiptImport'

function CountBadge({ count }: { count: number }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: 'var(--muted)',
      background: 'var(--surface)', border: '1px solid var(--divider)',
      borderRadius: 99, padding: '1px 6px', lineHeight: '14px',
    }}>
      {count}
    </span>
  )
}

export default function ReceiptReviewPage() {
  const router = useRouter()
  const [store, setStore] = useState<string | null>(null)
  const [matched, setMatched] = useState<MatchedReceiptItem[]>([])
  const [unmatched, setUnmatched] = useState<UnmatchedReceiptItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // The sessionStorage draft is a one-shot, destructive read (taken then
  // cleared). React Strict Mode double-invokes mount effects in dev — the
  // second invocation would otherwise find nothing left to read and
  // wrongly bounce back to /add right after the first invocation just
  // populated the page. This ref makes the take-and-redirect logic run
  // at most once per real mount, Strict Mode or not.
  const draftTakenRef = useRef(false)

  useEffect(() => {
    if (draftTakenRef.current) return
    draftTakenRef.current = true

    const draft = takeReceiptImportDraft()
    if (!draft) {
      router.replace('/add')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: one-time read of the sessionStorage draft on mount
    setStore(draft.store)
    setMatched(draft.matched)
    setUnmatched(draft.unmatched)
    setLoaded(true)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data }) => setHouseholdId(data?.household_id ?? null))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only
  }, [])

  function removeMatched(itemId: string) {
    setMatched(prev => prev.filter(m => m.itemId !== itemId))
  }
  function removeUnmatched(index: number) {
    setUnmatched(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!householdId || !userId) return
    setSaving(true)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const savePromise = (async () => {
      // Matched items — same restock semantics as the existing Restock
      // form: update the highest-quantity existing location if there is
      // one, else insert a new pantry row. Also refreshes estimated_price
      // with the real receipt price, and resolves any pending shopping
      // list entry for this item.
      for (const m of matched) {
        const defaultRow = m.inventoryRows.length > 0
          ? m.inventoryRows.reduce((a, b) => a.quantity >= b.quantity ? a : b)
          : null

        if (defaultRow) {
          const { error } = await supabase.from('inventory').update({
            quantity: defaultRow.quantity + m.quantity,
            purchase_date: today,
            added_by: userId,
          }).eq('id', defaultRow.id)
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase.from('inventory').insert({
            household_id: householdId,
            item_id: m.itemId,
            location: 'pantry',
            quantity: m.quantity,
            unit: m.unit,
            purchase_date: today,
            added_by: userId,
          })
          if (error) throw new Error(error.message)
        }

        if (m.price != null) {
          await supabase.from('items').update({ estimated_price: m.price }).eq('id', m.itemId)
        }
        // 'cleared', not 'purchased' — the inventory bump already happened
        // above. 'purchased' means "checked off, inventory bump still owed"
        // (applied later in bulk by the Shopping tab's "Clear and Update
        // Inventory"), and marking it that way here would double-count this
        // item's stock the next time that runs.
        await supabase.from('shopping_list')
          .update({ status: 'cleared', completed_at: new Date().toISOString() })
          .eq('item_id', m.itemId)
          .eq('status', 'pending')
      }

      // New items — same shape as the New Item form's insert.
      for (const u of unmatched) {
        const itemId = crypto.randomUUID()
        const { error: itemError } = await supabase.from('items').insert({
          id: itemId,
          household_id: householdId,
          name: u.name.trim(),
          category: u.category ?? 'Household & Other',
          default_unit: u.unit,
          low_threshold: 1,
          emoji: u.emoji,
          tags: [],
          preferred_stores: [],
          auto_shopping_list: true,
          estimated_price: u.price,
          canonical_name: u.canonicalName,
          catalog_id: null,
          active: true,
        })
        if (itemError) throw new Error(itemError.message)

        const { error: invError } = await supabase.from('inventory').insert({
          household_id: householdId,
          item_id: itemId,
          location: 'pantry',
          quantity: u.quantity,
          unit: u.unit,
          purchase_date: today,
          added_by: userId,
        })
        if (invError) throw new Error(invError.message)
      }

      return { restocked: matched.length, added: unmatched.length }
    })()

    toast.promise(savePromise, {
      loading: 'Saving your receipt…',
      success: ({ restocked, added }) => {
        const parts = []
        if (restocked > 0) parts.push(`restocked ${restocked}`)
        if (added > 0) parts.push(`added ${added} new item${added === 1 ? '' : 's'}`)
        return parts.length > 0 ? parts.join(', ').replace(/^./, c => c.toUpperCase()) : 'No changes made'
      },
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      await savePromise
      router.push('/inventory')
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setSaving(false)
    }
  }

  const totalCount = matched.length + unmatched.length

  return (
    <AppBackground>
      <PageHeader title="Review Receipt" backHref="/add" />

      {!loaded ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      ) : (
        <>
          {store && (
            <div style={{ padding: '4px 20px 0' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>From {store}</p>
            </div>
          )}

          {totalCount === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing left to save.</p>
            </div>
          )}

          {matched.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                  In your inventory
                </span>
                <CountBadge count={matched.length} />
              </div>
              {matched.map(m => (
                <SwipeActionRow
                  key={m.itemId}
                  actionLabel="Remove"
                  actionIcon="fi-rr-trash"
                  actionColor="var(--red)"
                  onAction={() => removeMatched(m.itemId)}
                >
                  <ReceiptItemRow
                    emoji={m.emoji}
                    name={m.name}
                    subtitle={m.receiptText}
                    price={m.price}
                    quantity={m.quantity}
                    unit={m.unit}
                    onQuantityChange={qty => setMatched(prev => prev.map(x => x.itemId === m.itemId ? { ...x, quantity: qty } : x))}
                  />
                </SwipeActionRow>
              ))}
            </div>
          )}

          {unmatched.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 4px' }}>
                <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                  New items
                </span>
                <CountBadge count={unmatched.length} />
              </div>
              {unmatched.map((u, i) => (
                <SwipeActionRow
                  key={i}
                  actionLabel="Remove"
                  actionIcon="fi-rr-trash"
                  actionColor="var(--red)"
                  onAction={() => removeUnmatched(i)}
                >
                  <ReceiptItemRow
                    emoji={u.emoji}
                    name={u.name}
                    subtitle={u.receiptText}
                    price={u.price}
                    quantity={u.quantity}
                    unit={u.unit}
                    editableName
                    onNameChange={name => setUnmatched(prev => prev.map((x, idx) => idx === i ? { ...x, name } : x))}
                    onQuantityChange={qty => setUnmatched(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: qty } : x))}
                  />
                </SwipeActionRow>
              ))}
            </div>
          )}

          {totalCount > 0 && (
            <div style={{ padding: '20px' }}>
              <Button
                type="button"
                variant="brand"
                disabled={saving}
                onClick={handleSave}
                style={{
                  width: '100%',
                  background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                  color: '#4A3300',
                  padding: '14px 16px',
                }}
              >
                {saving ? 'Saving…' : 'Save all'}
              </Button>
            </div>
          )}
        </>
      )}
    </AppBackground>
  )
}
