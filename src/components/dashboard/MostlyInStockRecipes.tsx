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
      <div className="grid grid-cols-2 gap-2">
        {recipes.map(recipe => (
          <RecipeCard key={recipe.id} {...recipe} />
        ))}
      </div>
    </div>
  )
}
