import type { InventoryItem } from './chefData'

export interface MatchIngredient {
  name: string
  canonicalName?: string | null
  isStaple?: boolean
}

// A small, curated allowlist of cheap/instant kitchen transformations —
// zesting or juicing a citrus fruit, separating an egg — where having the
// base ingredient in stock should count as having the derived form a
// recipe calls for. Deliberately NOT a generic "whole satisfies derived"
// rule: that would wrongly satisfy e.g. a recipe needing chicken breast
// from a whole chicken in stock, or flour from wheat, or butter from milk
// — transformations that need real equipment, time, or skill most home
// cooks don't have on hand. Only applied when expanding the RECIPE
// ingredient's identity set (see ingredientIdentitySet below) — never the
// reverse, so inventory that only has bottled lemon juice never satisfies
// a recipe that needs a whole lemon.
const DERIVED_FORM_MATCHES: Record<string, string[]> = {
  'lemon juice': ['lemon'], 'lemon zest': ['lemon'],
  'lime juice': ['lime'], 'lime zest': ['lime'],
  'orange juice': ['orange'], 'orange zest': ['orange'],
  'egg white': ['egg'], 'egg yolk': ['egg'],
}

// "Jasmine or basmati rice" means "jasmine rice or basmati rice" — the
// second variety's shared trailing noun ("rice") is grammatically elided
// from the first. A plain split on " or " would wrongly yield "jasmine"
// (missing "rice") as one alternative. When the left side is a single word
// and the right side has a trailing noun to borrow, resolve the ellipsis;
// otherwise (both sides already complete, e.g. "chicken broth or vegetable
// broth", or genuinely unrelated single words, e.g. "butter or margarine")
// leave each side as-is. Works directly off the raw name — independent of
// canonicalization, so it applies even to already-saved recipes whose
// stored canonical_name predates this fix.
function expandOrAlternatives(name: string): string[] {
  const match = name.match(/^(.+?)\s+or\s+(.+)$/i)
  if (!match) return []
  const [, left, right] = match.map(s => s.trim())
  const rightWords = right.split(/\s+/)
  if (!left.includes(' ') && rightWords.length > 1) {
    const trailing = rightWords.slice(1).join(' ')
    return [`${left} ${trailing}`.toLowerCase(), right.toLowerCase()]
  }
  return [left.toLowerCase(), right.toLowerCase()]
}

// The set of strings that identify a recipe ingredient for matching
// purposes: its raw name, any "X or Y" alternatives, its canonical name,
// and any derived-form base ingredients. Shared by every consumer that
// needs to know whether a recipe ingredient is on hand — computing this
// independently in more than one place is how the matcher and the
// card-level match-percent silently drifted out of sync before.
export function ingredientIdentitySet(name: string, canonicalName?: string | null): Set<string> {
  const ids = new Set([name.trim().toLowerCase()])
  for (const alt of expandOrAlternatives(name.trim())) ids.add(alt)
  const canon = canonicalName?.trim().toLowerCase()
  if (canon) {
    ids.add(canon)
    for (const base of DERIVED_FORM_MATCHES[canon] ?? []) ids.add(base)
  }
  return ids
}

// The identity strings for an inventory item — deliberately NOT expanded
// with or-alternatives/derived-forms (those only apply when expanding the
// recipe ingredient's side; see ingredientIdentitySet above).
export function inventoryIdentityStrings(inv: { name: string; canonicalName?: string | null }): string[] {
  const ids = [inv.name.trim().toLowerCase()]
  if (inv.canonicalName) ids.push(inv.canonicalName.trim().toLowerCase())
  return ids
}

// Compares by an identity SET rather than requiring both sides to agree on
// which name form (canonical vs. raw) they happen to have populated — a
// recipe ingredient's canonical_name ("olive oil") should still match an
// inventory item whose canonical_name is null but whose raw name happens
// to equal it, and vice versa. Requiring canonical-vs-canonical (or
// falling back to raw-vs-raw only when BOTH lack one) silently failed any
// match where just one side was missing a canonical name — which is most
// of them, since canonicalization is a recent addition.
function isOnHand(ing: MatchIngredient, inventory: InventoryItem[]): boolean {
  const ingIds = ingredientIdentitySet(ing.name, ing.canonicalName)
  return inventory.some(inv => {
    if (inv.quantity <= 0) return false
    return inventoryIdentityStrings(inv).some(id => ingIds.has(id))
  })
}

// Pantry staples (salt, pepper, oil, etc.) are excluded from the count
// entirely — a recipe shouldn't score lower just because a pinch of salt
// isn't tracked in inventory.
export function computeMatchPercent(ingredients: MatchIngredient[], inventory: InventoryItem[]): number {
  const counted = ingredients.filter(ing => !ing.isStaple)
  // A recipe made entirely of staples (salt, pepper, oil...) is something
  // the household is assumed to already have everything for — 100% match,
  // not 0%, which is what filtering everything out would otherwise leave.
  if (counted.length === 0) return 100
  const have = counted.filter(ing => isOnHand(ing, inventory)).length
  return Math.round((have / counted.length) * 100)
}
