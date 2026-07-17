import RecipeCard, { type RecipeCardData } from '@/components/chef/RecipeCard'

interface Props { recipes: RecipeCardData[] }

export default function MostlyInStockRecipes({ recipes }: Props) {
  if (recipes.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-135 font-extrabold uppercase tracking-003 block px-0.5"
        style={{ color: 'var(--foreground)' }}>
        Mostly in Stock Saved Recipes
      </span>
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {recipes.map(recipe => (
          <div key={recipe.id} className="shrink-0" style={{ width: 140 }}>
            <RecipeCard {...recipe} />
          </div>
        ))}
      </div>
    </div>
  )
}
