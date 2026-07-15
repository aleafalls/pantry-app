import { getIngredientChipColors } from '@/lib/chipColors'
import type { SuggestionIngredient } from '@/lib/chefSuggestions'

const MAX_VISIBLE = 5

interface Props {
  ingredients: SuggestionIngredient[]
  /** 'used' colors each chip via getIngredientChipColors; 'needed' uses a flat neutral style. */
  variant?: 'used' | 'needed'
}

// Staples (salt, pepper, cooking oil, etc.) are filtered out entirely —
// they don't help someone scanning a card decide if a suggestion is worth
// opening — and the remainder is capped so a long ingredient list doesn't
// overwhelm the card.
export default function IngredientChipRow({ ingredients, variant = 'used' }: Props) {
  const visible = ingredients.filter(ing => !ing.is_staple)
  const shown = visible.slice(0, MAX_VISIBLE)
  const remaining = visible.length - shown.length
  const chipColors = variant === 'used' ? getIngredientChipColors(shown) : null

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((ing, i) => (
        <span
          key={ing.name}
          className="text-105 font-semibold px-1.5 py-0.5 rounded-full"
          style={chipColors
            ? { background: chipColors[i].bg, color: chipColors[i].text }
            : { background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--foreground)' }}
        >
          {ing.emoji} {ing.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-105" style={{ color: 'var(--muted)', alignSelf: 'center' }}>
          and {remaining} more
        </span>
      )}
    </div>
  )
}
