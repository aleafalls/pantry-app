const CLAUSE_SPLIT = /\s+(?:with|over|topped with|served with|on top of|and)\s+/i
const MAX_WORDS = 6

/**
 * Turns a "What to Make Tonight" idea (often a full dish description, e.g.
 * "ground turkey soy stir fry with zucchini over rice") into a shorter
 * starting point for a Recipe Ideas search ("ground turkey soy stir fry").
 * Purely a cosmetic prefill — the user can edit it before searching.
 */
export function simplifyIdeaForQuery(idea: string): string {
  const trimmed = idea.trim()
  if (!trimmed) return ''
  const [firstClause] = trimmed.split(CLAUSE_SPLIT)
  const words = firstClause.trim().split(/\s+/)
  return words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(' ') : firstClause.trim()
}
