import type { RecipeData, RecipeIngredientData } from './RecipeTabs'
import RecipeSourceLink from '@/components/chef/RecipeSourceLink'
import ServingsBadge from '@/components/chef/ServingsBadge'

interface Props {
  recipe: RecipeData
  ingredients: RecipeIngredientData[]
  servings: number
  onOpenServingsDrawer: () => void
}

export default function CookView({ recipe, ingredients, servings, onOpenServingsDrawer }: Props) {
  const steps = (recipe.instructions ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const servingsChanged = recipe.servings != null && servings !== recipe.servings

  const metaPills = (
    <>
      {recipe.course_type && <MetaPill label={recipe.course_type} />}
      <ServingsBadge servings={servings} onClick={onOpenServingsDrawer} />
      {recipe.total_time_minutes && <MetaPill label={`${recipe.total_time_minutes} min`} />}
    </>
  )

  return (
    <div className="flex flex-col gap-7">
      {recipe.image_url ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- external/user-supplied recipe photo URL, not a local/static asset */}
          <img src={recipe.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div className="flex gap-2 flex-wrap" style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
            {metaPills}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {metaPills}
        </div>
      )}

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
          {servingsChanged && (
            <div
              className="flex items-start gap-2 rounded-11 mb-3"
              style={{ padding: '10px 12px', background: 'color-mix(in oklch, var(--amber) 12%, white 88%)' }}
            >
              <i className="fi-rr-exclamation" style={{ fontSize: 13, display: 'block', lineHeight: 1.4, color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
              <span className="text-115" style={{ color: 'var(--foreground)' }}>
                Serving size updates are not reflected in the instructions.
              </span>
            </div>
          )}
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

      {recipe.source_url && <RecipeSourceLink url={recipe.source_url} />}
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
