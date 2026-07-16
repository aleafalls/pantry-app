# Ingredient Canonicalization

**Status:** Built (not part of the original phase plan — added as shared infrastructure while building recipe-save flows)
**Endpoint:** `src/app/api/recipes/canonicalize-ingredients/route.ts`
**Model:** `claude-haiku-4-5`

## Purpose

Not a user-facing suggestion prompt like the others in this folder — a shared backend step that runs on **every** ingredient list right before it's written to `recipe_ingredients`, regardless of where the recipe came from (Recipe Ideas save, `/chef/new` manual entry, web import, photo import). Batches a whole ingredient list into one call and returns, per ingredient: a canonical name (brand/descriptor stripped), a best-guess category, and whether it's a near-universal pantry staple.

This is what lets "2 tbsp extra virgin olive oil" from one recipe and "1 cup EVOO" from another both resolve to the same `olive oil` canonical form for inventory matching — and lets the UI deprioritize staples (salt, pepper, oil) in ingredient chip rows the same way [What to Make Tonight](what-to-make-tonight.md)'s `is_staple` does.

## Where it's called from

- `src/lib/ingredientCanonicalize.ts` — a thin client wrapper (`canonicalizeIngredients(names: string[])`) that every save path imports directly:
  - `src/components/chef/RecipeIdeaDetailSheet.tsx` — Recipe Ideas' "Save to My Recipes"
  - `src/app/(app)/chef/new/page.tsx` — the shared New Recipe form (manual entry, web import, photo import all land here — see [Web Recipe Extraction](web-recipe-extraction.md) and [Photo Recipe Extraction](photo-recipe-extraction.md))
- Not used by [Item Enrichment](item-enrichment.md) even though that endpoint also returns a `canonical_name` — enrichment produces a canonical name for the *pantry item itself* at creation time; this endpoint produces one for *recipe ingredients* at save time. They share the same `CANONICAL_NAME_DESCRIPTION` text (`src/lib/canonicalIngredient.ts`) so the two independently-generated canonical forms are likely to match, but nothing here calls the enrichment endpoint or vice versa.

## Input

A flat array of ingredient name strings — no inventory, no preferences, no household context. Batched as `{index}: {name}` lines so the model can return results addressed by index rather than needing exact name round-tripping.

## Output (structured)

```ts
const CanonicalizedIngredientSchema = z.object({
  index: z.number().describe('The 0-based index of this ingredient from the input list — echo it back unchanged'),
  canonical_name: z.string().describe(CANONICAL_NAME_DESCRIPTION),
  category: z.enum(CATEGORIES as [string, ...string[]]).nullable().describe('Best matching category, or null if unclear'),
  is_staple: z.boolean().describe('True only for near-universal pantry basics almost every household already has (salt, black pepper, cooking oil, water, sugar, flour) — false for everything else, including specific proteins, produce, and dairy'),
})

const ResponseSchema = z.object({
  results: z.array(CanonicalizedIngredientSchema),
})
```

`category` **is** a hard `z.enum` here (unlike [Item Enrichment](item-enrichment.md)'s plain-string-plus-coerce pattern) — worth noting as an inconsistency between the two canonicalization-adjacent endpoints; an unmapped category from the model would throw and discard the whole batch's `canonical_name`/`is_staple` results too, which enrichment's design specifically avoids. Not yet hit in practice, but the same risk applies.

The `index` field exists so the client can safely match results back to the original list even if the model reorders them, without relying on exact string equality (ingredient names can repeat, e.g. "salt" appearing twice with different quantities).

## Prompt

**System:**
```
You help a pantry app match recipe ingredients to household inventory items that may be worded differently. For each ingredient, determine its canonical form ({CANONICAL_NAME_DESCRIPTION}), its likely category, and whether it's a near-universal pantry staple. Return one result per ingredient, in the same order, each carrying its original index.
```

**User:**
```
Ingredients (index: name):
{index}: {name}
...

Valid categories: {CATEGORIES, comma-separated}
```

## Open items

- `category` uses a hard enum while the sibling Item Enrichment endpoint deliberately avoids one for the exact same failure mode (see above) — worth aligning one way or the other.
- No retry/dedup logic if the model returns fewer results than ingredients sent, or skips an index — callers currently do optional-chaining fallback (`canonicalized[i]?.canonicalName ?? null`) rather than the route validating count/index coverage before responding.
