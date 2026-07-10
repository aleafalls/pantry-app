# Recipe Ideas

**Phase:** 14
**Status:** Designed, not yet built
**Endpoint:** `src/app/api/ai/recipe-ideas/route.ts`
**Model:** `claude-haiku-4-5` (candidate — same open question as [What to Make Tonight](what-to-make-tonight.md))

## Purpose

Specific, named recipes (Chicken Carbonara, Bolognese) built primarily from what the household has on hand, filling in a few additional ingredients as needed. This is the discovery mode — about finding something specifically worth making, not waste reduction. Unlike What to Make Tonight, it does **not** weight toward older/high-quantity items; match quality and "is this a good dish" come first.

## Where it lives on the Chef screen

- A "Recipe Ideas" section on the Chef tab's **All** overview, below What to Make Tonight — a small grid, each card showing a match-percentage badge (computed client-side from `ingredients`, not returned by the model — see Output below).
- **"View More"** re-runs the prompt and opens a dedicated expanded results page, same pattern as What to Make Tonight.
- **Structure exists, endpoint doesn't yet:** `/chef/ideas` (`src/app/(app)/chef/ideas/page.tsx`) is built and reachable via the "Ideas" tab (`ChefTabs.tsx`, shared across all four Chef routes) or the ask box on `/chef` (`RecipeIdeasPreview.tsx`), which passes its text through as `?q=`. Right now the page just shows a coming-soon empty state (echoing the query back if one was passed) — no AI call happens yet. Wiring this up is the next step once this prompt gets built.
- **Ingredient-anchored mode**: reached by tapping a specific ingredient on a What to Make Tonight card (e.g., "chicken"). Opens the same expanded results page, but the prompt is seeded with that ingredient as the anchor, and the page header reads "Recipe ideas for {ingredient}" instead of the generic heading.
- **"Save to My Recipes"** action on each result — the only one of the two Suggestion modes that has this, since these are meant to become real recipes. Saving inserts directly into `recipes` + `recipe_ingredients` using the same `ingredients` array the model returned (see Output) — no reshaping needed between "AI suggestion" and "saved recipe."

## Input

| Field | Source |
|---|---|
| `inventory` | Full active inventory: `name`, `quantity`, `unit`, `category` per item |
| `anchor_ingredient` | Optional — set only when escalating from a What to Make Tonight ingredient tap |
| `default_servings` | Household setting, from Settings |
| `household_preferences` | `dietary_restrictions`, `favorite_cuisines`, `macro_goals` from Phase 14.1 — dietary restrictions are a hard exclude, cuisines/macros are soft ranking boosts (same treatment as the original single-prompt design) |

No priority/staleness list here (unlike What to Make Tonight) — deliberately, per the decision that this mode focuses on discovering something new rather than using up what's already around.

## Output (structured)

```ts
const RecipeIdeasSchema = z.object({
  suggestions: z.array(z.object({
    recipe_name: z.string().describe('e.g. "Chicken Carbonara"'),
    description: z.string().describe('1 sentence'),
    servings: z.number(),
    instructions: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      quantity: z.string(),
      unit: z.string(),
      have_on_hand: z.boolean().describe('Whether this ingredient is already in the household inventory'),
    })),
  })),
})
```

Match percentage for the grid badge is computed client-side: `ingredients.filter(i => i.have_on_hand).length / ingredients.length * 100`, never trusted from a model-returned number — keeps it always consistent with the actual ingredient list shown, and this exact shape is what feeds `recipe_ingredients` (`name`, `quantity`, `unit`) directly on save, same structure Phases 15/16's web/photo recipe extraction already need.

## Prompt

**System (unanchored):**
```
You help a household discover specific, named recipes they could make using what they have on hand, filling in a few additional ingredients as needed. Prioritize genuinely good, well-known dishes over convenience — this is about discovering something worth making, not just using up what's in stock. Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it.
```

**System (anchored to a specific ingredient):**
```
You help a household discover specific, named recipes they could make using what they have on hand, filling in a few additional ingredients as needed. Prioritize genuinely good, well-known dishes over convenience — this is about discovering something worth making, not just using up what's in stock. Center every suggestion around {anchor_ingredient} specifically — different ways to prepare or feature it. The household also has other items on hand which suggestions may optionally incorporate, but {anchor_ingredient} should be the star of each one. Never suggest anything containing one of the household's dietary restrictions — treat every one as a hard exclude. Favorite cuisines and macro goals are soft preferences — lean into them when a good option fits, but don't force it.
```

**User (unanchored):**
```
Household inventory:
{name (quantity unit, category), one per line}

Household typically cooks for {default_servings} people.

Dietary restrictions (never include): {dietary_restrictions, comma-separated, or "none"}
Favorite cuisines (soft preference): {favorite_cuisines, comma-separated, or "none specified"}
Macro goals (soft preference): {macro_goals, comma-separated, or "none specified"}

Suggest 3-5 specific, named recipes using primarily what's on hand, with any additional ingredients needed clearly listed.
```

**User (anchored):**
```
Household inventory:
{name (quantity unit, category), one per line}

Household typically cooks for {default_servings} people.

Dietary restrictions (never include): {dietary_restrictions, comma-separated, or "none"}
Favorite cuisines (soft preference): {favorite_cuisines, comma-separated, or "none specified"}
Macro goals (soft preference): {macro_goals, comma-separated, or "none specified"}

Suggest 3-5 specific, named recipes centered on: {anchor_ingredient}
```

## Open items before implementation

- Model choice untested, same as What to Make Tonight.
- Ingredient → `matched_item_id` resolution on save (fuzzy-matching a recipe ingredient name to the household's actual `items` rows) isn't designed yet — needed for `recipe_ingredients.matched_item_id`, used later for recipe-vs-inventory matching. Can defer until the save flow is actually built.
