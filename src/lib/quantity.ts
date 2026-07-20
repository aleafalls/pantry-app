/**
 * Pulls a leading numeric amount out of a free-text recipe quantity
 * ("3" -> 3, "1/2" -> 0.5, "2-3" -> 2). Returns null for anything that
 * doesn't start with a number ("a pinch", "to taste") rather than guessing.
 */
export function parseLeadingQuantity(raw: string | null | undefined): number | null {
  if (!raw) return null
  const trimmed = raw.trim()

  const fraction = trimmed.match(/^(\d+)\s*\/\s*(\d+)/)
  if (fraction) {
    const denominator = Number(fraction[2])
    return denominator !== 0 ? Number(fraction[1]) / denominator : null
  }

  const decimal = trimmed.match(/^(\d+(\.\d+)?)/)
  return decimal ? Number(decimal[1]) : null
}

const FRACTION_SYMBOLS: [number, string][] = [
  [1 / 8, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [0.5, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [7 / 8, '⅞'],
]

// Rounds a scaled amount to the nearest common cooking fraction ("⅔ cup"
// instead of "0.6666666666666666 cup") rather than showing raw decimals.
function formatScaledAmount(n: number): string {
  if (n <= 0) return '0'
  const whole = Math.floor(n)
  const remainder = n - whole

  // Candidates are "no fraction" (0), every recognized fraction, and
  // "round up to the next whole number" (1) — all compared on equal
  // footing so a remainder doesn't default to 0 just because it's checked
  // first.
  const candidates: [number, string][] = [[0, ''], ...FRACTION_SYMBOLS, [1, '']]
  let [closestValue, closestSymbol] = candidates[0]
  let closestDiff = Math.abs(remainder - closestValue)
  for (const [value, symbol] of candidates) {
    const diff = Math.abs(remainder - value)
    if (diff < closestDiff) { closestDiff = diff; closestValue = value; closestSymbol = symbol }
  }

  if (closestValue === 1) return `${whole + 1}`
  if (closestValue === 0) {
    // A genuinely nonzero amount should never display as "0" (reads as
    // "use none") — fall back to the smallest recognized fraction instead
    // of implying the ingredient can be skipped.
    if (whole === 0) return FRACTION_SYMBOLS[0][1]
    return `${whole}`
  }
  return whole > 0 ? `${whole} ${closestSymbol}` : closestSymbol
}

/**
 * Scales a free-text recipe quantity by a factor (e.g. servings change).
 * Anything parseLeadingQuantity can't parse ("a pinch", "to taste") is
 * returned unchanged rather than guessed at.
 */
export function scaleQuantity(raw: string | null | undefined, factor: number): string | null {
  if (!raw) return raw ?? null
  if (factor === 1) return raw
  const parsed = parseLeadingQuantity(raw)
  if (parsed === null) return raw
  return formatScaledAmount(parsed * factor)
}

/**
 * Best-effort singular/plural agreement for a unit after scaling — only
 * handles the "exactly 1" case (strip a trailing "s", e.g. "cups" -> "cup",
 * "cloves" -> "clove"). Deliberately doesn't try to pluralize on the way up
 * ("2" + "cup"), since guessing plurals on arbitrary free text risks
 * getting irregular units wrong more often than it helps.
 */
export function agreeUnit(unit: string | null | undefined, scaledQuantity: string | null | undefined): string | null {
  if (!unit) return unit ?? null
  const isExactlyOne = scaledQuantity?.trim() === '1'
  const lower = unit.toLowerCase()
  if (isExactlyOne && lower.endsWith('s') && !lower.endsWith('ss')) {
    return unit.slice(0, -1)
  }
  return unit
}
