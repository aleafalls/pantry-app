import type { RecipeData, RecipeIngredientData } from './RecipeTabs'

interface Props {
  recipe: RecipeData
  ingredients: RecipeIngredientData[]
}

export default function CookView({ recipe, ingredients }: Props) {
  const steps = (recipe.instructions ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-7">
      <div className="flex gap-2 flex-wrap">
        {recipe.course_type && <MetaPill label={recipe.course_type} />}
        {recipe.servings && <MetaPill label={`${recipe.servings} servings`} />}
        {recipe.total_time_minutes && <MetaPill label={`${recipe.total_time_minutes} min`} />}
      </div>

      <div>
        <p className="text-13 font-extrabold uppercase tracking-003 mb-3" style={{ color: 'var(--muted)' }}>
          Ingredients
        </p>
        <div className="flex flex-col gap-3">
          {ingredients.map(ing => (
            <div key={ing.id} className="flex items-center justify-between gap-3">
              <span className="font-semibold" style={{ fontSize: 17, color: 'var(--foreground)' }}>{ing.name}</span>
              {(ing.quantity || ing.unit) && (
                <span style={{ fontSize: 16, color: 'var(--muted)', flexShrink: 0 }}>
                  {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <p className="text-13 font-extrabold uppercase tracking-003 mb-3" style={{ color: 'var(--muted)' }}>
            Instructions
          </p>
          <ol className="flex flex-col gap-4" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3" style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--foreground)' }}>
                <span className="font-extrabold" style={{ color: 'var(--amber)', flexShrink: 0 }}>{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full text-11 font-bold" style={{ padding: '4px 10px', background: 'var(--surface)', color: 'var(--foreground)' }}>
      {label}
    </span>
  )
}
