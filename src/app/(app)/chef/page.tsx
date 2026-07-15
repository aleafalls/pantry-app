import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import ChefAddMenu from '@/components/chef/ChefAddMenu'
import ChefSwipeableBody from '@/components/chef/ChefSwipeableBody'
import RecipeIdeasPreview from '@/components/chef/RecipeIdeasPreview'
import SavedRecipesPreview from '@/components/chef/SavedRecipesPreview'
import { getChefContext } from '@/lib/chefData'
import { computeMatchPercent, type MatchIngredient } from '@/lib/recipeMatch'
import ChefSuggestions from './ChefSuggestions'

export default async function ChefPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const [context, { data: recentRecipes }] = await Promise.all([
    getChefContext(supabase, profile.household_id),
    supabase
      .from('recipes')
      .select('id, name, emoji, image_url, source')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const recipeIds = (recentRecipes ?? []).map(r => r.id)
  const { data: previewIngredients } = recipeIds.length > 0
    ? await supabase.from('recipe_ingredients').select('recipe_id, name, canonical_name, is_staple').in('recipe_id', recipeIds)
    : { data: [] }

  const previewIngredientsByRecipe = new Map<string, MatchIngredient[]>()
  for (const ing of previewIngredients ?? []) {
    const list = previewIngredientsByRecipe.get(ing.recipe_id) ?? []
    list.push({ name: ing.name, canonicalName: ing.canonical_name, isStaple: ing.is_staple })
    previewIngredientsByRecipe.set(ing.recipe_id, list)
  }

  const savedRecipesPreview = (recentRecipes ?? []).map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    emoji: recipe.emoji,
    imageUrl: recipe.image_url,
    source: recipe.source,
    matchPercent: computeMatchPercent(previewIngredientsByRecipe.get(recipe.id) ?? [], context.inventory),
  }))

  return (
    <AppBackground>
      <PageHeader title="Chef" rightAction={<ChefAddMenu />}>
        <ChefTabs />
      </PageHeader>
      <ChefSwipeableBody>
        <div className="flex flex-col gap-6" style={{ padding: '20px 20px 0' }}>
          <ChefSuggestions
            inventory={context.inventory}
            priorityItems={context.priorityItems}
            defaultServings={context.defaultServings}
            preferences={context.preferences}
            householdId={profile.household_id}
            userId={user.id}
          />
          <RecipeIdeasPreview />
          <SavedRecipesPreview recipes={savedRecipesPreview} />
        </div>
      </ChefSwipeableBody>
    </AppBackground>
  )
}
