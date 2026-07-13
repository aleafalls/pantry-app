import Link from 'next/link'
import RecipeCard, { type RecipeCardData } from './RecipeCard'

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

      {recipes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {recipes.slice(0, 2).map(recipe => (
            <RecipeCard key={recipe.id} {...recipe} />
          ))}
        </div>
      ) : (
        <Link
          href="/chef/new"
          className="flex items-center gap-3 rounded-14 p-3"
          style={{ background: 'var(--surface)', textDecoration: 'none' }}
        >
          <div
            className="flex flex-col items-center justify-center gap-1 rounded-14"
            style={{ width: 64, height: 64, border: '1.5px dashed var(--divider)', flexShrink: 0 }}
          >
            <i className="fi-rr-plus" style={{ fontSize: 14, color: 'var(--muted)' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-13 font-bold" style={{ color: 'var(--foreground)' }}>Save your first recipe</span>
            <span className="text-105" style={{ color: 'var(--muted)' }}>Recipes you save will show up here</span>
          </div>
        </Link>
      )}
    </div>
  )
}
