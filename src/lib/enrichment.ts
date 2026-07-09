export interface EnrichmentParams {
  name: string
  category?: string
  unit?: string
  location?: string
  city?: string | null
  state?: string | null
  shoppingTier?: number | null
}

export interface EnrichmentResult {
  category: string | null
  unit: string | null
  location: string | null
  emoji: string
  estimated_price: number
}

// Module-level so it survives Next.js client-side navigation (no full page
// reload between the Add search page and the New Item form) — lets a
// request kicked off on one page be picked up by the next without
// duplicating the call.
const cache = new Map<string, Promise<EnrichmentResult | null>>()

function cacheKey(name: string) {
  return name.trim().toLowerCase()
}

async function requestEnrichment(params: EnrichmentParams): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch('/api/ai/enrich-item', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        category: params.category ?? '',
        unit: params.unit ?? 'each',
        location: params.location ?? 'pantry',
        city: params.city ?? '',
        state: params.state ?? '',
        shopping_tier: params.shoppingTier ?? 3,
      }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fires the enrichment request and stores it in the shared cache without
 * waiting for it. Call this at the moment a name is committed to (e.g.
 * tapping "Create") so the request has a head start before the New Item
 * form mounts.
 */
export function prewarmEnrichment(params: EnrichmentParams) {
  const key = cacheKey(params.name)
  if (!key || cache.has(key)) return
  cache.set(key, requestEnrichment(params))
}

/**
 * Returns the cached in-flight/completed request for this name if one
 * exists (e.g. from prewarmEnrichment), otherwise starts a fresh one.
 */
export function getOrFetchEnrichment(params: EnrichmentParams): Promise<EnrichmentResult | null> {
  const key = cacheKey(params.name)
  if (!key) return Promise.resolve(null)
  const existing = cache.get(key)
  if (existing) return existing
  const promise = requestEnrichment(params)
  cache.set(key, promise)
  return promise
}

/**
 * Always fires a fresh request — used by the manual autofill button, since
 * tapping it means the user wants a re-run for whatever is currently in
 * the field (e.g. after editing the name).
 */
export function refetchEnrichment(params: EnrichmentParams): Promise<EnrichmentResult | null> {
  const key = cacheKey(params.name)
  const promise = requestEnrichment(params)
  if (key) cache.set(key, promise)
  return promise
}
