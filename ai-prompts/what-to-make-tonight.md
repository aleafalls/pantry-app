# What to Make Tonight

**Phase:** 14
**Status:** Built
**Endpoint:** `src/app/api/ai/what-to-make-tonight/route.ts`
**Model:** `claude-opus-4-8` — this is a judgment/creativity task, not a classification task like item enrichment, so it defaults to the strongest model rather than Haiku. Revisit if cost becomes a concern; nothing about the prompt requires Opus specifically.

## Purpose

Fast, low-friction meal ideas built primarily from what's already in the household's inventory — not a formal recipe, just a workable combination and brief guidance. This is the waste-reduction mode: it gives slight preference to ingredients that are older or in larger supply. Contrast with [Recipe Ideas](recipe-ideas.md), which is about discovering something specific and new, not using up what's on hand.

## Where it lives on the Chef screen

- A "What to Make Tonight" section on the Chef tab (`src/app/(app)/chef/page.tsx` → `ChefSuggestions.tsx`) — a stacked list of up to 4 cards (title + ingredient chips + a chevron) styled like the Dashboard's glass stat cards, generated with the shopping toggle defaulted to **strict** (no shopping required).
- Dashboard's "What to Cook Now" button deep-links straight to `/chef/tonight` (the full results page), not just the Chef tab.
- **"View More"** on the Chef tab links to `src/app/(app)/chef/tonight/page.tsx` → `TonightResults.tsx`, which is where the shopping toggle actually lives — flipping it re-runs the prompt. Also has a manual "Get new ideas" button for regenerating without touching the toggle.
- No "Save to My Recipes" action — these suggestions are disposable by design, not meant to become a permanent recipe.
- **Not yet built:** tapping a card to open a detail view (description, full ingredient list) — a Sheet is the planned pattern, matching the app's existing bottom-sheet drawers, so the user doesn't lose their place in the list. Ingredient-level tap-to-escalate into Recipe Ideas (e.g. tapping "Chicken" to search recipes built around it) is planned to break out of the Sheet into its own page once Recipe Ideas exists, since it's a nested flow with its own results/sources. Cards currently render the chevron affordance but aren't clickable yet.

### Prefetching

The strict-mode (`allow_shopping: false`) call is fired from the Dashboard on mount, not on Chef navigation — `src/components/dashboard/ChefPrefetch.tsx` (invisible, renders nothing) kicks it off as soon as the Dashboard's server component resolves `getChefContext`. The result lands in a module-level cache (`src/lib/chefSuggestions.ts`, same in-flight-promise pattern as `src/lib/enrichment.ts`), keyed by `allowShopping`. Both the Chef tab and the Tonight page's initial load read from that cache via `getOrFetchTonightSuggestions` instead of firing their own request — so by the time the user taps into either screen, the strict-mode suggestions are usually already resolved. Toggling to "shopping allowed" or tapping "Get new ideas" always calls `refetchTonightSuggestions`, bypassing the cache for a fresh result.

## Input

| Field | Source |
|---|---|
| `inventory` | Full active inventory: `name`, `quantity`, `unit`, `category` per item |
| `priority_items` | Names of items that are older or higher-quantity than typical — pre-computed server-side (see below), *not* left to the model to infer from raw dates |
| `allow_shopping` | Boolean — the toggle state. `false` (default) = zero missing ingredients allowed. `true` = a couple of minor extras are OK |
| `default_servings` | Household setting, from Settings |
| `household_preferences` | `dietary_restrictions`, `favorite_cuisines`, `macro_goals` from Phase 14.1 — same hard-exclude/soft-boost treatment as Recipe Ideas. **Not wired up yet**: the `household_preferences` table and Chef Preferences screen (14.1) haven't been built, so the endpoint currently receives none and defaults to empty for all three. The prompt text already has the right shape for when that lands. |

**Computing `priority_items` server-side:** reuse the same logic already backing the dashboard's "Use These Up" section — oldest items by `purchase_date` — combined with a simple highest-quantity sort, deduplicated. Handing the model a pre-computed "these are good to use up" list is more reliable than asking it to reason about raw purchase dates and quantities across dozens of items itself.

## Output (structured)

```ts
const IngredientSchema = z.object({
  name: z.string().describe('Ingredient name — match the household inventory name when it\'s an on-hand item'),
  emoji: z.string().describe('A single emoji that best represents this specific ingredient, e.g. "🍗" for chicken, "🌿" for basil'),
  is_main: z.boolean().describe('True only for the single main/hero ingredient this suggestion centers on (usually the protein) — false for every supporting or side ingredient'),
})

const TonightSchema = z.object({
  suggestions: z.array(z.object({
    idea: z.string().describe('A short meal idea, e.g. "Sheet-pan chicken with roasted zucchini and sweet potato fries"'),
    description: z.string().describe('1-2 sentences of practical guidance — not numbered steps'),
    ingredients_used: z.array(IngredientSchema).describe('On-hand items this idea uses'),
    ingredients_needed: z.array(IngredientSchema).describe('Additional items to buy — always empty when allow_shopping is false'),
  })),
})
```

Each ingredient gets its own emoji from the model (same idea as item enrichment's emoji field) so chips can render `🍗 Chicken` without a client-side name→emoji lookup table. `is_main` drives chip color, not just visual variety: `src/lib/chipColors.ts`'s `getIngredientChipColors()` always gives the main/hero ingredient the yellow chip, and cycles supporting ingredients through a small pastel palette (teal/red/orange tints) in order. Chip text is always `var(--foreground)` regardless of background.

## Prompt

**System (allow_shopping = false):**
```
You help a household decide what to cook tonight using what they already have on hand. Suggest practical, low-effort meal ideas — not formal recipes with precise measurements, just a workable combination and brief guidance. Every suggestion must use only ingredients already in the household's inventory — do not suggest anything requiring a store trip. Give slight preference to combinations that use ingredients flagged as good to use up, but don't force it if a better combination exists without them. Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it.
```

**System (allow_shopping = true):**
```
You help a household decide what to cook tonight using what they already have on hand. Suggest practical, low-effort meal ideas — not formal recipes with precise measurements, just a workable combination and brief guidance. Suggestions may include up to 2 minor additional ingredients the household would need to pick up, but should mostly rely on what's already on hand. Give slight preference to combinations that use ingredients flagged as good to use up, but don't force it if a better combination exists without them. Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it.
```

**User:**
```
Household inventory:
{name (quantity unit, category), one per line}

Items that are older or in larger supply — give slight preference to using these when a good combination includes them:
{priority_items, comma-separated}

Household typically cooks for {default_servings} people.

Dietary restrictions (never include): {dietary_restrictions, comma-separated, or "none"}
Favorite cuisines (soft preference): {favorite_cuisines, comma-separated, or "none specified"}
Macro goals (soft preference): {macro_goals, comma-separated, or "none specified"}

Suggest 3-5 meal ideas for tonight.
```

## Remaining follow-ups

- Wire in real `household_preferences` once Phase 14.1 (Chef Preferences data model + screen) is built.
- Card tap → Sheet detail view (full description, complete ingredient list) — not built yet.
- Ingredient-level escalation into Recipe Ideas — deferred until Recipe Ideas itself is built (including the lazy web-search + extraction design from that conversation).
- No automated verification yet beyond typecheck/lint/no-server-errors — the actual suggestion quality and Opus 4.8 cost/latency need a real click-through test.
