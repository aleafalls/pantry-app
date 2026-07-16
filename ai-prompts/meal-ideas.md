# Meal Ideas (Stage 1)

**Status:** Built
**Endpoint:** `src/app/api/ai/meal-ideas/route.ts`
**Model:** `claude-haiku-4-5`

## Purpose

Unified backend for both "What to Make Tonight" and "Recipe Ideas" — a fast, lightweight idea generator (name + description + a few key ingredients, no quantities, no instructions). This replaced two separate prompts (formerly `what-to-make-tonight` and `recipe-ideas`) that had converged on nearly identical shapes once Recipe Ideas was cut down from generating full AI-written recipes to just a starting point — see "Why this merge happened" below.

This is **Stage 1** of a two-stage flow. Stage 1 never produces a complete, cookable recipe on its own — for that, see [Find the Recipe](find-recipe.md) (Stage 2), which searches for and imports a genuinely real recipe once the user picks an idea worth pursuing.

## Why this merge happened

Recipe Ideas originally generated full recipes (quantities, step-by-step instructions) plus an optional `source_url` via `web_search`. Real-world latency testing showed this was far too slow for an interactive UI — Sonnet+search ~67s, Haiku+search ~38s, even Haiku-no-search ~19.5s, against a ~10s target. The fix was splitting generation into a fast idea-only Stage 1 and an on-demand Stage 2 that does the expensive work (search + real extraction) only for the one idea the user actually wants. Once Stage 1 dropped instructions/quantities, it became structurally identical to What to Make Tonight — both are "3-5 short ideas from inventory + a few toggles" — so the two backends were merged into this one endpoint. The **UI stayed as two separate tabs** (Tonight / Ideas) since Tonight's zero-config immediacy (the Dashboard's "What can I make tonight?" button deep-links straight to prefetched results) was worth preserving as a distinct, decision-free entry point — see [`src/lib/mealIdeas.ts`](../src/lib/mealIdeas.ts) for how the two presets are layered over one backend.

## The two presets

| | Tonight | Ideas |
|---|---|---|
| `shopping_mode` | `strict` (default) or `minor_extras` (toggle) | `unconstrained` |
| `weight_priority_items` | `true` — favors older/high-quantity inventory | `false` — no waste-reduction bias, pure discovery |
| `query` | not used (escalation from a Tonight idea routes into the *Ideas* free-text search instead, via `simplifyIdeaForQuery`) | free text from the search box or a starter prompt |
| Entry point | Dashboard "What can I make tonight?", Chef tab Tonight preview | Chef tab "Ideas" tab, the ask box on the Chef "All" tab |

`anchor_ingredient` is a third directive mode (mutually exclusive with `query`, takes priority if both are set) — fully implemented server-side but has no UI call site today, same as before the merge.

## Input

| Field | Notes |
|---|---|
| `inventory` | Full active inventory: `name`, `quantity`, `unit`, `category` per item |
| `shopping_mode` | `'strict' \| 'minor_extras' \| 'unconstrained'` — see table above |
| `weight_priority_items` | boolean — gates whether `priority_items` is read/used at all; server ignores `priority_items` when `false` regardless of what's sent |
| `priority_items` | Names of items that are older or higher-quantity than typical, pre-computed server-side by the caller (same logic as the dashboard's "Use These Up") — only meaningful when `weight_priority_items` is true |
| `query` / `anchor_ingredient` | Mutually exclusive; `anchor_ingredient` wins if both set |
| `default_servings`, `household_preferences` | Household settings, unchanged from before the merge |

## Output (structured)

```ts
const MealIdeaIngredientSchema = z.object({
  name: z.string().describe('Ingredient name — match the household inventory name when it\'s an on-hand item'),
  emoji: z.string().describe('A single emoji that best represents this specific ingredient, e.g. "🍗" for chicken, "🌿" for basil'),
  is_main: z.boolean().describe('True only for the single main/hero ingredient this suggestion centers on (usually the protein) — false for every supporting or side ingredient'),
  is_staple: z.boolean().describe('True only for near-universal pantry basics almost every household already has (salt, black pepper, cooking oil, butter, sugar, flour) — false for everything else, including specific proteins, produce, and dairy'),
  have_on_hand: z.boolean().describe('Whether this ingredient is already in the household inventory'),
})

const MealIdeaSchema = z.object({
  idea: z.string().describe('A short meal idea or specific named dish, e.g. "Sheet-pan chicken with roasted zucchini" or "Chicken Carbonara"'),
  description: z.string().describe('1-2 sentences'),
  ingredients: z.array(MealIdeaIngredientSchema),
})

const MealIdeasSchema = z.object({ suggestions: z.array(MealIdeaSchema) })
```

Dropped relative to the two prior schemas: `recipe_name` (unified on `idea`), per-suggestion `servings` (real servings now come from Stage 2's actual extracted recipe — the UI falls back to household `default_servings` for display before that), `instructions`, `quantity`/`unit` per ingredient, `source_url`/`source_name` (moved to Stage 2), and the `web_search` tool entirely (no search happens in Stage 1 at all).

`ingredients_used`/`ingredients_needed` (Tonight's old two-array split) collapsed into one `ingredients` array with `have_on_hand` — consumers filter client-side (`s.ingredients.filter(i => i.have_on_hand)` etc.) instead of the model pre-splitting. Match-percent (`matchPercent()` in `src/lib/mealIdeas.ts`) still trusts the model's `have_on_hand` directly, same as before the merge — not switched to client-side live-inventory recomputation.

## Prompt

System prompt is assembled from fragments, branching on `shopping_mode` and the query/anchor directive:

**Base** (unconstrained mode): `You help a household discover specific, named meal ideas they could make using what they have on hand, filling in a few additional ingredients as needed. Prioritize genuinely good, well-known dishes over convenience — this is about discovering something worth making, not just using up what's in stock.`

**Base** (strict/minor_extras modes): `You help a household decide what to cook using what they already have on hand. Suggest practical, low-effort meal ideas — not formal recipes with precise measurements, just a workable combination and brief guidance.`

**Shopping rule**, appended after the base:
- `strict`: `Every suggestion must use only ingredients already in the household's inventory — do not suggest anything requiring a store trip.`
- `minor_extras`: `Suggestions may include up to 2 minor additional ingredients the household would need to pick up, but should mostly rely on what's already on hand.`
- `unconstrained`: `Suggestions don't need to be limited to what's on hand — prioritize genuinely good, specific, well-known dishes even if they require several additional ingredients; mark have_on_hand accurately per ingredient regardless.`

**Priority-items rule** (only when `weight_priority_items` is true): ` Give slight preference to combinations that use ingredients flagged as good to use up, but don't force it if a better combination exists without them.`

**Directive** (anchor): ` Center every suggestion around {anchor_ingredient} specifically — different ways to prepare or feature it. The household also has other items on hand which suggestions may optionally incorporate, but {anchor_ingredient} should be the star of each one.`

**Directive** (query): ` The household has given a specific direction they want to go: "{query}". Every suggestion should fit that direction, while still leaning on what's already in their inventory where it makes sense.`

**Common tail** (all modes): ` Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it. For each suggestion, mark exactly one ingredient as the main/hero ingredient (usually the protein) and every other ingredient as a side. Also mark each ingredient as a staple or not — staples are near-universal pantry basics (salt, pepper, cooking oil, butter, etc.), used only to keep suggestion cards focused on the ingredients that actually define the dish. For each ingredient, mark have_on_hand true only if it matches something in the household's inventory.`

**User:**
```
Household inventory:
{name (quantity unit, category), one per line}

[Items that are older or in larger supply — give slight preference to using these when a good combination includes them:
{priority_items, comma-separated} — only when weight_priority_items is true]

Household typically cooks for {default_servings} people.

Dietary restrictions (never include): {dietary_restrictions, comma-separated, or "none"}
Favorite cuisines (soft preference): {favorite_cuisines, comma-separated, or "none specified"}
Macro goals (soft preference): {macro_goals, comma-separated, or "none specified"}

{finalLine}
```

`{finalLine}` is `Suggest 3-5 meal ideas centered on: {anchor_ingredient}` (anchored), `Suggest 3-5 meal ideas for: {query}` (query), or `Suggest 3-5 meal ideas using primarily what's on hand.` (neither).

## Client-side caching

`src/lib/mealIdeas.ts` keeps two separate caching layers over the one backend (deliberately not unified — they solve different problems):
- **Tonight**: module-level promise cache (`prewarmTonightSuggestions`, `getOrFetchTonightSuggestions`, `refetchTonightSuggestions`, `getCachedTonightSuggestions`), keyed directly by `shoppingMode` (`'strict' | 'minor_extras'`). Survives client-side navigation — a Dashboard-fired prefetch can be picked up by the Chef tab or Tonight page without duplicating the request.
- **Ideas**: `sessionStorage` cache (`getCachedRecipeIdeas`/`setCachedRecipeIdeas`), keyed by query string — restores the last search on tab reload/backgrounding.

## Open items

- `anchor_ingredient` still has no UI entry point (e.g. tapping a specific pantry item to search ideas centered on it) — carried over unchanged from before the merge.
- No structured quality eval comparing Haiku's Ideas-mode output to the old Sonnet-generated full recipes — the model swap (Sonnet → Haiku for Ideas) was driven by latency, not benchmarked for suggestion quality.
