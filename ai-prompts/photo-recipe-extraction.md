# Photo Recipe Extraction

**Phase:** 16
**Status:** Built
**Endpoint:** `src/app/api/recipes/import-photo/route.ts`
**Model:** `claude-haiku-4-5` with vision input — no fallback path (unlike [Web Recipe Extraction](web-recipe-extraction.md), there's no structured-data shortcut for a photo; every request hits the model).

## Purpose

Let a household photograph a cookbook page, printed recipe card, or handwritten recipe and pull it into the app the same way [Web Recipe Extraction](web-recipe-extraction.md) does for a URL — prefilling the New Recipe form instead of requiring manual transcription.

## Where it lives

- Same screen as web import: `/chef/import` (`src/app/(app)/chef/import/page.tsx`) has a photo picker alongside the URL field. Selecting a photo calls `fetchRecipePhotoImport` (`src/lib/recipeImport.ts`), which posts multipart form data (`photo` field) to this endpoint, stashes the result via `setRecipeImportDraft` (`source: 'photo'`, `sourceUrl: ''`), and redirects to `/chef/new` for review before saving — same shared draft shape and same "always lands in the editable form first" pattern as web import.

## Auth & validation

Unlike the web-import endpoint (which has no auth check of its own — see [Web Recipe Extraction](web-recipe-extraction.md)), this route explicitly requires a signed-in user with a household (`supabase.auth.getUser()` + a `profiles.household_id` lookup) before doing anything, since the photo is archived to Supabase Storage under that household's path.

- Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Max size: 3.5 MB (kept under Claude's base64-encoded image size limit once the file is base64'd for the API call).
- The original photo is uploaded to the `recipe-photos` storage bucket (`{household_id}/{uuid}.{ext}`) as a **best-effort archival copy** — fired off without `await`ing, so a storage hiccup doesn't block extraction; errors are just logged (`console.error('Recipe photo upload failed:', err)`).

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
})
```

Same shape as Web Recipe Extraction's schema minus `image_url` (a photo import has no source page to pull an image URL from — `imageUrl` is always returned as `null` in the response, distinct from the archival photo uploaded to Storage, which isn't surfaced back to the client at all). `course_type` goes through the same `matchCourseType()` coercion against `COURSE_TYPES` as the web-import path.

## Prompt

**System:**
```
Extract a recipe from the given photo — a cookbook page, recipe card, or printed recipe. If the photo does not contain a recipe, return an empty ingredients array.
```

**User content:** an image block (base64, `media_type` matching the uploaded file's actual MIME type) plus the text `Extract the recipe from this photo.`

If `parsed.name` is empty or `parsed.ingredients` is empty (model found nothing, or the request threw), the route returns `422 { error: "Couldn't find a recipe in that photo." }`.

## Open items

- No retry/rotate guidance for poorly-photographed pages (glare, skew, partial crop) — a bad photo just fails with the generic 422, no specific feedback on what to fix.
- Same as web import: the recipe reaching `/chef/new` runs through `canonicalize-ingredients` uniformly at save time, not within this endpoint.
