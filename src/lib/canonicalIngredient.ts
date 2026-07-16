// Shared between /api/ai/enrich-item and /api/recipes/canonicalize-ingredients
// so both AI calls describe "canonical name" identically — they were
// worded slightly differently and the model treated the same input
// inconsistently between them (e.g. "Kosher Salt" -> "salt" on one route,
// "kosher salt" — unstripped — on the other).
export const CANONICAL_NAME_DESCRIPTION =
  'The core grocery item this is, with brand names and any descriptor stripped — quality/grade (e.g. "extra virgin"), religious/dietary certification (e.g. "kosher", "halal", "organic"), prep notes (e.g. "diced", "for cooking"), and the single overwhelmingly common default variety of an ingredient when a recipe would mean that by default (e.g. "black" for pepper). Do not strip a variety when multiple are common and a recipe naming one likely means that one specifically (e.g. keep "jasmine rice", "basmati rice" — rice has no single default variety). Examples: "extra virgin olive oil" -> "olive oil", "93% lean ground turkey" -> "ground turkey", "kosher salt" -> "salt", "Kirkland almond milk" -> "almond milk", "black pepper" -> "pepper". Lowercase, singular where natural.'
