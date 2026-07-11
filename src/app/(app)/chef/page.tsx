import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import RecipeIdeasPreview from '@/components/chef/RecipeIdeasPreview'
import SavedRecipesPreview from '@/components/chef/SavedRecipesPreview'
import { getChefContext } from '@/lib/chefData'
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

  const context = await getChefContext(supabase, profile.household_id)

  return (
    <AppBackground>
      <PageHeader title="Chef">
        <ChefTabs />
      </PageHeader>
      <div className="flex flex-col gap-6" style={{ padding: '20px 20px 0' }}>
        <ChefSuggestions
          inventory={context.inventory}
          priorityItems={context.priorityItems}
          defaultServings={context.defaultServings}
          householdId={profile.household_id}
          userId={user.id}
        />
        <RecipeIdeasPreview />
        <SavedRecipesPreview />
      </div>
    </AppBackground>
  )
}
