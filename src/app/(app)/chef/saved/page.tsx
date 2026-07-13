import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import SavedRecipesGrid, { type SavedRecipeListItem } from '@/components/chef/SavedRecipesGrid'
import { getChefContext } from '@/lib/chefData'
import { computeMatchPercent } from '@/lib/recipeMatch'

export default async function ChefSavedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const [{ data: recipes }, context] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, name, emoji, image_url, source, course_type, tags, total_time_minutes')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false }),
    getChefContext(supabase, profile.household_id),
  ])

  const recipeIds = (recipes ?? []).map(r => r.id)
  const { data: allIngredients } = recipeIds.length > 0
    ? await supabase.from('recipe_ingredients').select('recipe_id, name').in('recipe_id', recipeIds)
    : { data: [] }

  const ingredientsByRecipe = new Map<string, string[]>()
  for (const ing of allIngredients ?? []) {
    const list = ingredientsByRecipe.get(ing.recipe_id) ?? []
    list.push(ing.name)
    ingredientsByRecipe.set(ing.recipe_id, list)
  }

  const recipeList: SavedRecipeListItem[] = (recipes ?? []).map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    emoji: recipe.emoji,
    imageUrl: recipe.image_url,
    source: recipe.source,
    matchPercent: computeMatchPercent(ingredientsByRecipe.get(recipe.id) ?? [], context.inventory),
    courseType: recipe.course_type,
    tags: recipe.tags ?? [],
    totalTimeMinutes: recipe.total_time_minutes,
  }))

  return (
    <AppBackground>
      <SavedRecipesGrid recipes={recipeList} />
    </AppBackground>
  )
}
