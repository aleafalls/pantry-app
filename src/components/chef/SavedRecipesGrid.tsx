'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from './ChefTabs'
import ChefAddMenu from './ChefAddMenu'
import ChefSwipeableBody from './ChefSwipeableBody'
import { Input } from '@/components/ui/input'
import RecipeCard, { type RecipeCardData } from './RecipeCard'
import SavedRecipesFilterBar from './SavedRecipesFilterBar'
import { matchesTimeBucket } from '@/lib/recipeTimeBuckets'

export interface SavedRecipeListItem extends RecipeCardData {
  courseType: string | null
  tags: string[]
  totalTimeMinutes: number | null
}

interface Props {
  recipes: SavedRecipeListItem[]
}

export default function SavedRecipesGrid({ recipes }: Props) {
  const [query, setQuery] = useState('')
  const [courseTypeFilters, setCourseTypeFilters] = useState<string[]>([])
  const [timeFilters, setTimeFilters] = useState<string[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])

  const tagOptions = Array.from(new Set(recipes.flatMap(r => r.tags))).sort((a, b) => a.localeCompare(b))

  const filtered = recipes.filter(recipe => {
    const matchesSearch = !query || recipe.name.toLowerCase().includes(query.toLowerCase())
    const matchesCourseType = courseTypeFilters.length === 0
      || (recipe.courseType != null && courseTypeFilters.includes(recipe.courseType))
    const matchesTime = timeFilters.length === 0
      || timeFilters.some(bucket => matchesTimeBucket(recipe.totalTimeMinutes, bucket))
    const matchesTags = tagFilters.length === 0
      || tagFilters.some(tag => recipe.tags.includes(tag))
    return matchesSearch && matchesCourseType && matchesTime && matchesTags
  })

  const hasActiveFilters = query || courseTypeFilters.length > 0 || timeFilters.length > 0 || tagFilters.length > 0

  return (
    <>
      <PageHeader title="Saved Recipes" backHref="/chef" rightAction={<ChefAddMenu />}>
        <ChefTabs />

        <div style={{ position: 'relative' }}>
          <Input
            type="text"
            placeholder="Search recipes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="rounded-xl pr-10 text-sm"
            style={{
              background: 'oklch(100% 0 0 / 0.7)',
              borderColor: 'oklch(100% 0 0 / 0.5)',
              color: 'var(--foreground)',
              padding: '10px 40px 10px 14px',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Clear search"
            >
              <i className="fi-rr-cross-small" style={{ display: 'block', fontSize: 18, lineHeight: 1, color: 'var(--muted)' }} />
            </button>
          )}
        </div>

        <SavedRecipesFilterBar
          courseTypeFilters={courseTypeFilters}
          onCourseTypeFiltersChange={setCourseTypeFilters}
          timeFilters={timeFilters}
          onTimeFiltersChange={setTimeFilters}
          tagFilters={tagFilters}
          onTagFiltersChange={setTagFilters}
          tagOptions={tagOptions}
        />
      </PageHeader>

      <ChefSwipeableBody>
        <div style={{ padding: '20px 20px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 40 }}>{hasActiveFilters ? '🔍' : '📖'}</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {hasActiveFilters ? 'No recipes match your search or filters' : 'No saved recipes yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(recipe => (
                <RecipeCard key={recipe.id} {...recipe} />
              ))}
            </div>
          )}
        </div>
      </ChefSwipeableBody>
    </>
  )
}
