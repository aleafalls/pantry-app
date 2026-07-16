# AI Prompts

Source of truth for every Claude API call the app makes — one file per prompt. Draft and refine the prompt here before it gets implemented in code; keep this updated if a prompt changes after launch.

Each file covers: trigger (when it fires), model, input, output schema, and the literal system/user prompt text.

| Prompt | File | Phase | Status |
|---|---|---|---|
| Item Enrichment (category, unit, location, emoji, price, canonical name) | [item-enrichment.md](item-enrichment.md) | 13 | Built |
| Meal Ideas — Stage 1 (unified "What to Make Tonight" + "Recipe Ideas" backend) | [meal-ideas.md](meal-ideas.md) | 14 | Built |
| Find the Recipe — Stage 2 (search + real recipe extraction) | [find-recipe.md](find-recipe.md) | 14 | Built |
| Web Recipe Extraction | [web-recipe-extraction.md](web-recipe-extraction.md) | 15 | Built |
| Photo Recipe Extraction | [photo-recipe-extraction.md](photo-recipe-extraction.md) | 16 | Built |
| Ingredient Canonicalization (shared save-time helper, not user-facing) | [ingredient-canonicalization.md](ingredient-canonicalization.md) | — | Built |

All six are live in the codebase as of this update. This folder now trails implementation rather than leading it — treat it as documentation of what's actually running, and update a file whenever its corresponding route changes.

**Note:** "What to Make Tonight" and "Recipe Ideas" used to be two separate prompts/endpoints — they were merged into Meal Ideas (Stage 1) + Find the Recipe (Stage 2) once Recipe Ideas was redesigned from generating full AI-written recipes into a lightweight idea generator, at which point the two backends converged on nearly identical shapes. The UI still presents them as two separate tabs (Tonight / Ideas) with different default toggles — see [meal-ideas.md](meal-ideas.md) for the full story.
