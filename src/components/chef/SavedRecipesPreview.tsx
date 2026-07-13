import Link from 'next/link'
import RecipeCard, { AddRecipeCard, type RecipeCardData } from './RecipeCard'

interface Props {
  recipes: RecipeCardData[]
}

export default function SavedRecipesPreview({ recipes }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-135 font-extrabold uppercase tracking-003" style={{ color: 'var(--foreground)' }}>
          Saved recipes
        </span>
        <Link href="/chef/saved" className="text-xs font-bold" style={{ color: 'var(--amber)', textDecoration: 'none' }}>
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AddRecipeCard />
        {recipes.slice(0, 6).map(recipe => (
          <RecipeCard key={recipe.id} {...recipe} />
        ))}
      </div>
    </div>
  )
}
