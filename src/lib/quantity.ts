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
