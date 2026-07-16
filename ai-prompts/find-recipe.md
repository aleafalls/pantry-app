# Find the Recipe (Stage 2)

**Status:** Built
**Endpoint:** `src/app/api/ai/find-recipe/route.ts`
**Model:** `claude-haiku-4-5`

## Purpose

**Stage 2** of the meal-ideas flow — turns a lightweight [Stage 1](meal-ideas.md) idea into a genuinely real, saveable recipe. Not a recipe generator: it's a single-purpose "find one real URL for this idea" lookup. The actual recipe content (ingredients, instructions, photo) comes from the app's existing [Web Recipe Extraction](web-recipe-extraction.md) pipeline, reused completely unchanged — this endpoint's only job is picking the URL.

This is the direct answer to the original concern that AI-suggested recipes don't carry the trust of a real, chef-sourced recipe: rather than having the model invent ingredients/instructions and tack on a citation link, the final recipe the user reviews and saves is scraped from an actual page.

## Where it's triggered from

A "Find the Recipe" button in both `src/components/chef/SuggestionDetailSheet.tsx` (Tonight ideas) and `src/components/chef/RecipeIdeaDetailSheet.tsx` (Ideas results) — available on both presets, not just Ideas, since Stage 1 now shares one schema and it's an opt-in action that doesn't add friction to Tonight's fast path unless tapped.

## Client flow — reuses existing import pipeline, no new extraction code

`src/lib/findRecipe.ts`'s `findAndImportRecipe(idea, keyIngredients, onStage?)`:

```ts
1. POST /api/ai/find-recipe  → { found, url, source_name }
2. if found.url:  fetchRecipeImport(url)   // EXISTING, unchanged — src/lib/recipeImport.ts
3. if imported.data:  setRecipeImportDraft(imported.data)   // EXISTING, unchanged
4. caller does: router.push('/chef/new')   // same review-before-save flow as manual URL/photo import
```

Step 2 is the same function used when a user manually pastes a URL on `/chef/import` — full schema.org extraction, Claude fallback, SSRF protection, real photo, all inherited for free. `RecipeImportDraft.source` stays `'web'`, no new variant — a Stage-2 result is factually a web-imported recipe, and nothing branches on `source` today beyond code this redesign already removed.

`onStage` drives two-stage loading text in the calling component (`'searching'` → "Finding a recipe…", `'reading'` → "Reading the recipe…"), matching the loading/error UI pattern already established on `/chef/import`.

## Input

```json
{ "idea": "Sheet-pan chicken with roasted zucchini", "key_ingredients": ["chicken", "zucchini"] }
```

`key_ingredients` — up to 4 non-staple ingredient names pulled from the Stage 1 idea (`suggestion.ingredients.filter(i => !i.is_staple).map(i => i.name).slice(0, 4)`), passed for search context only.

## Output (structured)

```ts
const FindRecipeSchema = z.object({
  found: z.boolean().describe('Whether a real, well-matching recipe was found via search'),
  url: z.string().nullable().describe('The exact URL of the best matching real recipe found via the web_search tool — null if found is false. Never invent a URL.'),
  source_name: z.string().nullable().describe('Short site or publisher name for url, e.g. "Bon Appétit" — null if found is false.'),
})
```

## Model config — the Haiku + web_search gotcha

```ts
tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 1, allowed_callers: ['direct'] }]
```

**`allowed_callers: ['direct']` is required on Haiku.** Confirmed via testing: `claude-haiku-4-5` returns a 400 on `web_search` without it (`"does not support programmatic tool calling"`) — Sonnet doesn't need this flag, which made it easy to miss when this endpoint was built by adapting the pattern from the old (Sonnet-based) `recipe-ideas` route's `web_search` usage. `max_uses: 1` — this is a single targeted lookup for one known dish, not a multi-recipe batch search, so it doesn't need the higher cap the old Recipe Ideas prompt used. `max_tokens: 1024` — no recipe content generated, just a URL decision.

Latency for this specific shape (one URL lookup for one known dish) is **not yet empirically measured** — the ~38s Haiku+search number from testing the old design was for generating 3-5 *full* recipes with search in one call, a much bigger task. Don't assume a number carries over; the two-stage loading UI (see above) is deliberately built to tolerate uncertainty rather than target a specific time.

## Failure modes and UI text

| Condition | User-facing message |
|---|---|
| `found: false` (no good match) | "Couldn't find a good match for this online — try tweaking the idea and searching manually." (the existing free-text Recipe Ideas search box stays visible as a fallback) |
| `found: true` but extraction 422s (already-handled failure mode of `/api/recipes/import` — e.g. a non-schema.org page the Claude fallback also can't parse) | "Found a recipe page but couldn't read the details from it." |
| Network/500 | "Something went wrong — try again." |

## Open items

- Latency is unmeasured — needs a real smoke test pass under normal usage, and possibly a loading-state redesign if it turns out to run much longer than the two-stage text implies.
- No logging/metrics on find→import success rate — would be useful for judging whether the search step is actually finding good matches before investing in prompt tuning here.
