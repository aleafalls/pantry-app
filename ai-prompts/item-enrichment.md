# Item Enrichment

**Phase:** 13
**Status:** Built
**Endpoint:** `src/app/api/ai/enrich-item/route.ts`
**Model:** `claude-haiku-4-5` — no `thinking`/`effort` params (Haiku 4.5 doesn't support them; this is a plain classification/lookup task that doesn't need reasoning)

## Purpose

Fills in details the New Item form doesn't collect from the user (emoji, estimated price, canonical name) and offers best-effort suggestions for fields the user may not have set yet (category, unit, storage location) — without ever overwriting a value the user already chose.

## Trigger points

Both call the same client-side function against the same endpoint, using whatever is currently in the New Item form:

1. **Barcode scan path — automatic.** Fires on mount when the New Item form is reached via a resolved barcode name (`?barcode=` present with a name). Runs in the background after the form has already rendered with name/category from the barcode lookup, so navigation isn't blocked waiting on a second network round-trip.
2. **Manual entry path — "Autofill" button.** A button near the name field, disabled until the user has typed a name. Tapping it calls the same enrichment function with the form's current state.

## Input

| Field | Source |
|---|---|
| `name` | Form's current name value (required — the call doesn't fire without one) |
| `category` | Form's current category value, may be empty |
| `unit` | Form's current unit value (defaults to `each`) |
| `location` | Form's current storage-location value (defaults to `pantry`) |
| `city`, `state` | Household region, from Settings — regional price context, unrelated to storage location. Falls back to `'unknown — use typical US grocery pricing'` when neither is set. |
| `shopping_tier` | Household shopping-tier slider (1–5), from Settings — see mapping below |

## Output (structured, via Zod schema + `client.messages.parse()`)

```ts
const EnrichmentSchema = z.object({
  category: z.string().nullable()
    .describe('Only set if confident based on the item name; null otherwise'),
  unit: z.string().nullable()
    .describe('The most precise unit for how this item is typically sold/measured; null if the current unit is already correct or not confident'),
  location: z.string().nullable()
    .describe('Where this item is most likely stored in the home; null if the current location is already correct or not confident'),
  emoji: z.string().describe('A single emoji that best represents this item — prefer food/product emojis over generic symbols'),
  estimated_price: z.number().describe('Estimated price in USD per one unit of the chosen/given unit'),
  canonical_name: z.string().describe(`${CANONICAL_NAME_DESCRIPTION} Used to match this item against recipe ingredients written differently.`),
})
```

**`category`/`unit`/`location` are plain `z.string()`, not `z.enum(...)` as originally designed.** An enum mismatch throws and discards the *entire* parsed response — price, emoji, and canonical_name included — so one unmapped suggestion on any of these three fields shouldn't be able to sink the other three. Valid values are enforced afterward server-side with a small `coerceEnum(value, validValues)` helper (returns `null` if the model's value isn't in the list) instead of relying on Zod to reject at parse time.

`canonical_name` (added after initial build, shared with [Recipe Ideas](recipe-ideas.md)'s save flow and [Web Recipe Extraction](web-recipe-extraction.md)) uses `CANONICAL_NAME_DESCRIPTION` from `src/lib/canonicalIngredient.ts` — the same description string every canonicalization prompt in the app shares, so "extra virgin olive oil," "EVOO," and "olive oil" from a recipe all resolve to the same canonical form for inventory matching.

## Fill rules (client-side, after the response comes back)

| Field | Applied when |
|---|---|
| `category` | Only if the form's category is currently empty |
| `unit` | Only if the form's unit is currently still `each` (the default) |
| `location` | Only if the form's storage location is currently still `pantry` (the default) |
| `emoji` | Only if the form's emoji is currently still `📦` (the default) — never overwrites a manually picked emoji |
| `estimated_price` | Always — nothing else in the form sets this |
| `canonical_name` | Always — stored on the item row, not a form field the user edits directly |

## Shopping tier → prompt text mapping

Household setting: a 1–5 slider in Settings, labeled at 1/3/5 (Budget / Standard / Premium), with 2 and 4 as selectable in-between blends. Stored as `households.shopping_tier` (integer, default `3`).

| Value | Label | Prompt description |
|---|---|---|
| 1 | Budget | shops primarily at discount/value grocery stores (e.g., Walmart, Aldi) and prefers store-brand products |
| 2 | Budget–Standard | shops at a mix of discount and mainstream grocery stores, usually choosing store-brand over name-brand |
| 3 | Standard | shops at typical mainstream grocery stores with a mix of name-brand and store-brand products |
| 4 | Standard–Premium | shops at mainstream grocery stores but frequently chooses organic or premium options for some items |
| 5 | Premium | shops primarily at premium/specialty grocery stores (e.g., Whole Foods) and prefers organic products |

Passed as qualitative context rather than a numeric price multiplier — a flat multiplier would apply the same markup to every item regardless of category, but organic/premium pricing doesn't scale evenly (e.g., organic milk vs. organic beef). Letting the model reason about the specific item plus this description produces a more realistic per-item estimate than a formula would.

## Prompt

**System:**
```
You help a household pantry app enrich a new grocery item with details it doesn't have yet: category, unit, storage location, emoji, estimated price, and a canonical name. Only suggest a category, unit, or storage location if you're reasonably confident based on the item name — leave it null rather than guess. Emoji, price, and canonical name should always be provided.
```

**User:**
```
Item: {name}
Category: {category || '(not yet set)'}
Unit: {unit} (currently the default — suggest a more precise one if appropriate)
Storage location: {location} (currently the default — suggest a more precise one if appropriate)
Region: {region}
Shopping style: This household {shopping_tier_description}.

Valid categories: Canned Goods, Dry Goods & Grains, Baking, Condiments & Sauces, Snacks, Beverages, Frozen, Dairy & Refrigerated, Produce, Meat & Seafood, Spices & Seasonings, Pet Supplies, Household & Other

Valid units: each, pair, pack, box, bag, bunch, loaf, roll, fl oz, cup, pint, quart, gallon, ml, L, oz, lb, g, kg, can, jar, bottle, carton, pouch, tub, block, slice

Valid storage locations: pantry, fridge, freezer, spice_rack, cleaning_supplies, garage_overflow
```

## Open items

- No automated eval of category/unit/location/canonical_name accuracy — quality has only been checked by spot-testing real items, not a structured pass.
