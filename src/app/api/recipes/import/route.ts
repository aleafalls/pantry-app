import { NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { Agent } from 'undici'
import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { COURSE_TYPES } from '@/lib/constants'

const client = new Anthropic()

const UNIT_WORDS = new Set([
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
  'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g', 'kg',
  'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters', 'liter', 'liters', 'l',
  'pinch', 'pinches', 'dash', 'dashes', 'clove', 'cloves', 'can', 'cans', 'jar', 'jars',
  'bottle', 'bottles', 'package', 'packages', 'pkg', 'stick', 'sticks', 'slice', 'slices',
  'bunch', 'bunches', 'head', 'heads', 'sprig', 'sprigs', 'quart', 'quarts', 'pint', 'pints',
  'gallon', 'gallons', 'piece', 'pieces', 'fillet', 'fillets',
])

// ── SSRF guard ──────────────────────────────────────────────
// This route fetches a user-supplied URL server-side, so it must not be
// usable to reach internal/private network addresses.
function isPrivateOrLoopbackIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    return false
  }
  if (version === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1') return true
    if (lower.startsWith('fe80:')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
    return false
  }
  return true // couldn't classify — treat as unsafe
}

// Thrown for bad/unsafe input (maps to 400). Anything else thrown while
// fetching the page maps to 502 — see the POST handler below.
class ImportValidationError extends Error {}

interface ValidatedUrl {
  url: URL
  ip: string
  family: 4 | 6
}

async function validateImportUrl(rawUrl: string): Promise<ValidatedUrl> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new ImportValidationError("That doesn't look like a valid URL.")
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ImportValidationError('Only http and https links are supported.')
  }
  if (url.hostname === 'localhost') {
    throw new ImportValidationError("That URL isn't reachable.")
  }
  let addresses: { address: string; family: number }[]
  try {
    addresses = await lookup(url.hostname, { all: true })
  } catch {
    throw new ImportValidationError("Couldn't resolve that URL.")
  }
  if (addresses.length === 0 || addresses.some(a => isPrivateOrLoopbackIp(a.address))) {
    throw new ImportValidationError("That URL isn't reachable.")
  }
  const [{ address, family }] = addresses
  return { url, ip: address, family: family === 6 ? 6 : 4 }
}

// Pins the connection to the IP we already validated, instead of letting
// undici re-resolve the hostname at connect time — otherwise a malicious
// domain can pass validation by answering the DNS lookup with a public IP,
// then answer the real connection moments later with a private/internal one
// ("DNS rebinding"), defeating the check above entirely.
function pinnedDispatcher(hostname: string, ip: string, family: 4 | 6): Agent {
  return new Agent({
    connect: {
      lookup: (host, _options, callback) => {
        if (host !== hostname) {
          callback(new Error('Blocked: unexpected host during pinned fetch'), '', 0)
          return
        }
        callback(null, ip, family)
      },
    },
  })
}

const MAX_REDIRECTS = 5
const FETCH_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  accept: 'text/html',
}

// Fetches a user-supplied recipe URL, validating and IP-pinning every hop —
// including redirects, which `redirect: 'follow'` would otherwise chase
// without re-checking for private/internal targets.
async function fetchRecipePage(rawUrl: string): Promise<string> {
  let currentUrl = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const { url, ip, family } = await validateImportUrl(currentUrl)
    const dispatcher = pinnedDispatcher(url.hostname, ip, family)
    let res: Response
    try {
      res = await fetch(url.toString(), {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
        dispatcher,
      } as RequestInit & { dispatcher: Agent })
    } finally {
      await dispatcher.close()
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Redirect with no location header.')
      currentUrl = new URL(location, url).toString()
      continue
    }
    if (!res.ok) throw new Error(`Unexpected status ${res.status}`)
    return await res.text()
  }
  throw new Error('Too many redirects.')
}

// ── schema.org JSON-LD extraction ──────────────────────────

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (!data) return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item)
      if (found) return found
    }
    return null
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const type = obj['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.some(t => typeof t === 'string' && t.toLowerCase() === 'recipe')) {
      return obj
    }
    if (obj['@graph']) {
      const found = findRecipeNode(obj['@graph'])
      if (found) return found
    }
  }
  return null
}

function extractImage(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return extractImage(value[0])
  if (value && typeof value === 'object') {
    const url = (value as Record<string, unknown>).url
    if (typeof url === 'string') return url
  }
  return null
}

function extractInstructions(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map(step => {
        if (typeof step === 'string') return step
        if (step && typeof step === 'object') {
          const s = step as Record<string, unknown>
          if (typeof s.text === 'string') return s.text
          if (Array.isArray(s.itemListElement)) return extractInstructions(s.itemListElement)
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function parseServings(value: unknown): number | null {
  if (typeof value === 'number') return Math.round(value)
  if (Array.isArray(value)) return parseServings(value[0])
  if (typeof value === 'string') {
    const match = value.match(/\d+/)
    return match ? parseInt(match[0], 10) : null
  }
  return null
}

function parseIsoDurationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(value)
  if (!match) return null
  const [, days, hours, minutes] = match
  const total = Number(days ?? 0) * 24 * 60 + Number(hours ?? 0) * 60 + Number(minutes ?? 0)
  return total > 0 ? total : null
}

const VULGAR_FRACTIONS: Record<string, string> = {
  '¼': '1/4', '½': '1/2', '¾': '3/4',
  '⅓': '1/3', '⅔': '2/3',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}
const VULGAR_FRACTION_RE = /[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g

// Recipe sites commonly render fractions as a single Unicode glyph rather
// than "1/2" — e.g. "½ teaspoon" or a mixed "1½ teaspoons" with no space
// before the glyph. Normalizing to plain ASCII fractions first lets the
// existing digit-based quantity regex handle them without a separate path.
function normalizeFractions(text: string): string {
  return text
    .replace(/(\d)([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1 $2')
    .replace(VULGAR_FRACTION_RE, ch => VULGAR_FRACTIONS[ch])
}

function parseIngredientLine(raw: string): { quantity: string; unit: string; name: string } {
  const text = normalizeFractions(raw.trim()).replace(/\s+/g, ' ')
  const qtyMatch = text.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+/)
  let rest = text
  let quantity = ''
  if (qtyMatch) {
    quantity = qtyMatch[1].trim()
    rest = text.slice(qtyMatch[0].length)
  }
  const words = rest.split(' ')
  let unit = ''
  if (words.length > 0 && UNIT_WORDS.has(words[0].toLowerCase().replace(/\.$/, ''))) {
    unit = words[0].replace(/\.$/, '')
    rest = words.slice(1).join(' ').replace(/^of\s+/i, '')
  }
  return { quantity, unit, name: rest.trim() || text }
}

function matchCourseType(value: unknown): string | null {
  const candidates = Array.isArray(value) ? value : [value]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const match = COURSE_TYPES.find(c => c.toLowerCase() === candidate.trim().toLowerCase())
    if (match) return match
  }
  return null
}

function extractTags(recipeNode: Record<string, unknown>): string[] {
  // Keyed by lowercase so a cuisine echoed in keywords (very common in
  // recipe-site SEO) doesn't survive as two case-variant duplicates.
  const tags = new Map<string, string>()
  const add = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.has(trimmed.toLowerCase())) tags.set(trimmed.toLowerCase(), trimmed)
  }
  const cuisine = recipeNode.recipeCuisine
  for (const c of Array.isArray(cuisine) ? cuisine : [cuisine]) {
    if (typeof c === 'string') add(c)
  }
  const keywords = recipeNode.keywords
  if (typeof keywords === 'string') {
    for (const k of keywords.split(',')) add(k)
  } else if (Array.isArray(keywords)) {
    for (const k of keywords) {
      if (typeof k === 'string') add(k)
    }
  }
  return Array.from(tags.values()).slice(0, 6)
}

interface ImportedRecipe {
  name: string
  courseType: string | null
  tags: string[]
  servings: number | null
  totalTimeMinutes: number | null
  ingredients: { name: string; quantity: string; unit: string }[]
  instructions: string
  imageUrl: string | null
}

function fromStructuredData(recipeNode: Record<string, unknown>): ImportedRecipe | null {
  const name = typeof recipeNode.name === 'string' ? recipeNode.name.trim() : ''
  const rawIngredients = Array.isArray(recipeNode.recipeIngredient) ? recipeNode.recipeIngredient : []
  if (!name || rawIngredients.length === 0) return null

  return {
    name,
    courseType: matchCourseType(recipeNode.recipeCategory),
    tags: extractTags(recipeNode),
    servings: parseServings(recipeNode.recipeYield),
    totalTimeMinutes:
      parseIsoDurationMinutes(recipeNode.totalTime) ??
      parseIsoDurationMinutes(recipeNode.cookTime) ??
      parseIsoDurationMinutes(recipeNode.prepTime),
    ingredients: rawIngredients
      .filter((i: unknown): i is string => typeof i === 'string' && i.trim().length > 0)
      .map(parseIngredientLine),
    instructions: extractInstructions(recipeNode.recipeInstructions),
    imageUrl: extractImage(recipeNode.image),
  }
}

// ── Claude fallback extraction ─────────────────────────────

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

async function fromClaudeExtraction(pageText: string, imageUrl: string | null): Promise<ImportedRecipe | null> {
  const response = await client.messages.parse({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: 'Extract a recipe from the given webpage text. If the text does not actually contain a recipe, return an empty ingredients array.',
    messages: [{ role: 'user', content: pageText }],
    output_config: { format: zodOutputFormat(ImportedRecipeSchema) },
  })

  const parsed = response.parsed_output
  if (!parsed || !parsed.name.trim() || parsed.ingredients.length === 0) return null

  return {
    name: parsed.name.trim(),
    courseType: matchCourseType(parsed.course_type),
    tags: parsed.tags.slice(0, 6),
    servings: parsed.servings,
    totalTimeMinutes: parsed.total_time_minutes,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions.join('\n'),
    imageUrl: parsed.image_url ?? imageUrl,
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!rawUrl) {
    return NextResponse.json({ error: 'A URL is required.' }, { status: 400 })
  }

  let html: string
  try {
    html = await fetchRecipePage(rawUrl)
  } catch (err) {
    if (err instanceof ImportValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Couldn't load that page — it may be blocking automated requests." }, { status: 502 })
  }

  const $ = cheerio.load(html)

  let recipeNode: Record<string, unknown> | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeNode) return
    try {
      const parsed = JSON.parse($(el).contents().text())
      recipeNode = findRecipeNode(parsed)
    } catch {
      // malformed JSON-LD block — skip it
    }
  })

  let imported: ImportedRecipe | null = recipeNode ? fromStructuredData(recipeNode) : null

  if (!imported) {
    $('script, style, noscript').remove()
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000)
    const fallbackImage = recipeNode ? extractImage((recipeNode as Record<string, unknown>).image) : null
    try {
      imported = await fromClaudeExtraction(pageText, fallbackImage)
    } catch {
      imported = null
    }
  }

  if (!imported) {
    return NextResponse.json({ error: "Couldn't find a recipe on that page." }, { status: 422 })
  }

  return NextResponse.json({
    name: imported.name,
    courseType: imported.courseType ?? '',
    tags: imported.tags,
    servings: imported.servings ?? undefined,
    totalTimeMinutes: imported.totalTimeMinutes ?? '',
    ingredients: imported.ingredients,
    instructions: imported.instructions,
    imageUrl: imported.imageUrl,
  })
}
