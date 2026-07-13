import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'

interface Props {
  params: Promise<{ recipeId: string }>
}

export default async function RecipeDetailPage({ params }: Props) {
  const { recipeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name, course_type, servings, total_time_minutes, instructions')
    .eq('id', recipeId)
    .single()

  if (!recipe) notFound()

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('id, name, quantity, unit')
    .eq('recipe_id', recipeId)

  return (
    <AppBackground>
      <PageHeader title={recipe.name} backHref="/chef/saved" />
      <div className="flex flex-col gap-6" style={{ padding: '20px 20px 0' }}>

        {/* Meta row — placeholder detail view, full design comes in a later phase */}
        <div className="flex gap-2 flex-wrap">
          {recipe.course_type && (
            <span className="rounded-full text-11 font-bold" style={{ padding: '4px 10px', background: 'var(--surface)', color: 'var(--foreground)' }}>
              {recipe.course_type}
            </span>
          )}
          {recipe.servings && (
            <span className="rounded-full text-11 font-bold" style={{ padding: '4px 10px', background: 'var(--surface)', color: 'var(--foreground)' }}>
              {recipe.servings} servings
            </span>
          )}
          {recipe.total_time_minutes && (
            <span className="rounded-full text-11 font-bold" style={{ padding: '4px 10px', background: 'var(--surface)', color: 'var(--foreground)' }}>
              {recipe.total_time_minutes} min
            </span>
          )}
        </div>

        <div>
          <p className="text-11 font-extrabold uppercase tracking-003 mb-2" style={{ color: 'var(--muted)' }}>
            Ingredients
          </p>
          <div className="flex flex-col gap-2">
            {(ingredients ?? []).map(ing => (
              <div key={ing.id} className="flex items-center justify-between text-sm" style={{ color: 'var(--foreground)' }}>
                <span>{ing.name}</span>
                {(ing.quantity || ing.unit) && (
                  <span style={{ color: 'var(--muted)' }}>{[ing.quantity, ing.unit].filter(Boolean).join(' ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-11 font-extrabold uppercase tracking-003 mb-2" style={{ color: 'var(--muted)' }}>
            Instructions
          </p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)', lineHeight: 1.6 }}>
            {recipe.instructions}
          </p>
        </div>
      </div>
    </AppBackground>
  )
}
