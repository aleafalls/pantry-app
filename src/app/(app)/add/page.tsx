'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'

interface HouseholdItem {
  id: string
  name: string
  emoji: string | null
  default_unit: string
  category: string
}

interface CatalogItem {
  id: string
  name: string
  emoji: string | null
  default_unit: string
  category: string
  default_location: string
}

export default function AddPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [householdItems, setHouseholdItems] = useState<HouseholdItem[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  // Load household id on mount + auto-focus
  useEffect(() => {
    inputRef.current?.focus()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data }) => setHouseholdId(data?.household_id ?? null))
    })
  }, [])

  // Debounced search
  useEffect(() => {
    if (!householdId) return
    if (!query.trim()) { setHouseholdItems([]); setCatalogItems([]); return }

    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()

      const [{ data: items }, { data: catalog }] = await Promise.all([
        supabase.from('items')
          .select('id, name, emoji, default_unit, category')
          .eq('household_id', householdId)
          .eq('active', true)
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(20),
        supabase.from('catalog')
          .select('id, name, emoji, default_unit, category, default_location')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(20),
      ])

      const householdNames = new Set((items ?? []).map(i => i.name.toLowerCase()))
      const dedupedCatalog = (catalog ?? []).filter(c => !householdNames.has(c.name.toLowerCase()))

      setHouseholdItems(items ?? [])
      setCatalogItems(dedupedCatalog)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, householdId])

  function handleCatalogTap(item: CatalogItem) {
    router.push(`/add/restock?catalogId=${item.id}`)
  }

  const hasResults = householdItems.length > 0 || catalogItems.length > 0
  const showCreate = query.trim().length > 0

  return (
    <AppBackground>

      {/* Search header — custom layout to fit input alongside back arrow */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '16px 20px 12px',
        background: 'oklch(99% 0.003 85 / 0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--muted)', textDecoration: 'none', flexShrink: 0, lineHeight: 1 }} aria-label="Go back">
            <i className="fi-rr-angle-left" style={{ fontSize: 18, display: 'block' }} />
          </a>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search or add an item…"
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
            {/* Barcode icon placeholder — Phase 12 */}
            <button
              type="button"
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--muted)',
              }}
              aria-label="Scan barcode"
            >
              <i className="fi-rr-barcode-scan" style={{ display: 'block', fontSize: 18, color: 'var(--muted)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '8px 0' }}>

        {!query.trim() && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Search for an item to add or restock it in your pantry.
            </p>
          </div>
        )}

        {loading && query.trim() && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Searching…</p>
          </div>
        )}

        {/* Household items */}
        {householdItems.length > 0 && (
          <>
            <div style={{ padding: '8px 20px 4px' }}>
              <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                In your pantry
              </span>
            </div>
            {householdItems.map(item => (
              <button
                key={item.id}
                onClick={() => router.push(`/inventory/${item.id}`)}
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
                <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </>
        )}

        {/* Catalog items */}
        {catalogItems.length > 0 && (
          <>
            <div style={{ padding: '8px 20px 4px' }}>
              <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
                From catalog
              </span>
            </div>
            {catalogItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleCatalogTap(item)}
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

        {/* No results message */}
        {!loading && query.trim() && !hasResults && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No matches found.</p>
          </div>
        )}

        {/* Always-visible Create row */}
        {showCreate && (
          <Link
            href={`/add/new?name=${encodeURIComponent(query.trim())}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 20px',
              borderBottom: '1px solid var(--divider)',
              textDecoration: 'none',
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--yellow-light)', fontSize: 14, fontWeight: 700, color: '#4A3300',
            }}>
              +
            </span>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Create &ldquo;{query.trim()}&rdquo;
            </p>
          </Link>
        )}
      </div>
    </AppBackground>
  )
}
