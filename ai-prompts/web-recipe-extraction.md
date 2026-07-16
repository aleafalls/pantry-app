# Web Recipe Extraction

**Phase:** 15
**Status:** Built
**Endpoint:** `src/app/api/recipes/import/route.ts`
**Model:** `claude-haiku-4-5` — **fallback only**; most real recipe pages skip the model entirely (see Two-stage extraction below)

## Purpose

Let a household paste a URL to a recipe they found elsewhere and pull it into the app as a real, editable recipe (name, ingredients, instructions, tags, servings, time) — prefilling the New Recipe form rather than requiring manual entry. This is the counterpart to [Recipe Ideas](recipe-ideas.md)'s `source_url`: that feature *cites* a real recipe found via search; this one *imports* one the user already has a link to.

## Two-stage extraction — AI is a fallback, not the primary path

1. **schema.org JSON-LD (no AI, free, instant).** Nearly every modern recipe site embeds a `<script type="application/ld+json">` block with a `Recipe` node (name, `recipeIngredient`, `recipeInstructions`, `recipeYield`, `totalTime`/`cookTime`/`prepTime`, `recipeCategory`, `recipeCuisine`, `keywords`, `image`). `fromStructuredData()` parses this directly — ingredient-line parsing (quantity/unit/name split, Unicode vulgar-fraction normalization like `½` → `1/2`), ISO-8601 duration parsing (`PT25M` → 25), and course-type matching against `COURSE_TYPES` all happen with plain string/regex code, no model call.
2. **Claude fallback (only when step 1 finds nothing usable).** If there's no `Recipe` JSON-LD node, or it's missing a name/ingredients, the page's visible text (`$('body').text()`, scripts/styles stripped, truncated to 15,000 chars) is sent to `claude-haiku-4-5` with the same output shape, asking it to extract a recipe from raw page text instead of structured data.

This keeps the common case (well-formed recipe blogs) fast and free, and only pays for a model call on sites with nonstandard markup.

## SSRF protections (server-side URL fetch, not itself part of the prompt)

The route fetches a user-supplied URL server-side, so it validates and pins every hop before requesting it:
- Rejects non-`http(s)` protocols and `localhost`.
- Resolves the hostname via DNS, rejects any address that's private/loopback/link-local (`isPrivateOrLoopbackIp` — covers IPv4 `127.x`/`10.x`/`172.16–31.x`/`192.168.x`/`169.254.x` and IPv6 `::1`/`fe80:`/`fc`/`fd` ranges).
- **Pins the connection to the already-validated IP** (`pinnedDispatcher`) rather than letting `undici` re-resolve the hostname at connect time — otherwise a malicious domain could pass the DNS check with a public IP, then answer the real TCP connection moments later with a private one (DNS rebinding), defeating the check entirely.
- Re-validates on every redirect hop (`redirect: 'manual'`, manual re-resolve + re-pin), capped at 5 redirects — `redirect: 'follow'` would otherwise chase redirects without re-checking each target.

## Where it lives

- `/chef/import` (`src/app/(app)/chef/import/page.tsx`) — a URL input + a photo picker (see [Photo Recipe Extraction](photo-recipe-extraction.md)) on the same screen. Submitting the URL calls `fetchRecipeImport` (`src/lib/recipeImport.ts`), stashes the result in `sessionStorage` (`chef-recipe-import-draft`) via `setRecipeImportDraft`, and redirects to `/chef/new`, which reads it back with `takeRecipeImportDraft()` (read-once — cleared immediately so it doesn't linger past that single redirect) to prefill the New Recipe form for review before saving.
- No direct "Save" from the import screen itself — the imported data always lands in the editable New Recipe form first, so the user can fix anything the extraction got wrong before it's written to `recipes`.

## Output (structured)

```ts
const ImportedRecipeSchema = z.object({
  name: z.string(),
  servings: z.number().nullable(),
  total_time_minutes: z.number().nullable(),
  course_type: z.string().nullable().describe(`Best match to one of: ${COURSE_TYPES.join(', ')} — or null if unclear`),
  tags: z.array(z.string()).describe('A few short descriptive tags (cuisine, diet, etc.) — empty array if none fit'),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.string().describe('e.g. "2", "1 1/2" — empty string if not specified'),
    unit: z.string().describe('e.g. "cups", "tbsp" — empty string if not specified'),
  })),
  instructions: z.array(z.string()).describe('One cooking step per entry, no numbering'),
  image_url: z.string().nullable(),
})
```

Same shape whether the recipe came from structured data or the model — `fromStructuredData()` and `fromClaudeExtraction()` both normalize into the same internal `ImportedRecipe` interface before the route returns a response, so the client never needs to know which path produced the result. `course_type` is validated against `COURSE_TYPES` after either path via `matchCourseType()` (case-insensitive match, `null`/no-match → empty string) — the model doesn't get a hard enum constraint here (same open-string-then-coerce pattern as [Item Enrichment](item-enrichment.md)'s category/unit/location).

## Prompt (Claude fallback path only)

**System:**
```
Extract a recipe from the given webpage text. If the text does not actually contain a recipe, return an empty ingredients array.
```

**User:** the page's visible text (`$('body').text()`, whitespace-collapsed, truncated to 15,000 characters) — no separate instruction text, just the raw content.

If `parsed.name` is empty or `parsed.ingredients` is empty (either because the model found nothing or the request errored), the route returns `422 { error: "Couldn't find a recipe on that page." }` rather than a partial/garbage result.

## Open items

- Fallback extraction hasn't been tested against a broad sample of "nonstandard markup" sites — mostly validated against sites that *do* have JSON-LD (which skips the model entirely).

Note: canonicalization (`canonical_name`/`category`/`is_staple`) isn't part of this endpoint — it happens uniformly at save time in `/chef/new` (`src/app/(app)/chef/new/page.tsx`, via `canonicalize-ingredients`), the same shared form every recipe source (import, photo, manual entry, Recipe Ideas) writes through.
