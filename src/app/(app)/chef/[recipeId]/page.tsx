import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import { getChefContext } from '@/lib/chefData'
import RecipeTabs from './RecipeTabs'

interface Props {
  params: Promise<{ recipeId: string }>
}

export default async function RecipeDetailPage({ params }: Props) {
  const { recipeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name, emoji, course_type, tags, servings, total_time_minutes, instructions, source_url, image_url')
    .eq('id', recipeId)
    .eq('household_id', profile.household_id)
    .single()

  if (!recipe) notFound()

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('id, name, quantity, unit, canonical_name, category, is_staple')
    .eq('recipe_id', recipeId)
    .order('name')

  const context = await getChefContext(supabase, profile.household_id)

  return (
    <AppBackground>
      <RecipeTabs
        recipe={recipe}
        ingredients={ingredients ?? []}
        inventory={context.inventory}
        householdId={profile.household_id}
        userId={user.id}
      />
    </AppBackground>
  )
}
