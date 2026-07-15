import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChefPreferencesClient from './ChefPreferencesClient'

export default async function ChefPreferencesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const { data: preferences } = await supabase
    .from('household_preferences')
    .select('dietary_restrictions, favorite_cuisines, macro_goals')
    .eq('household_id', profile.household_id)
    .maybeSingle()

  return (
    <ChefPreferencesClient
      householdId={profile.household_id}
      dietaryRestrictions={preferences?.dietary_restrictions ?? []}
      favoriteCuisines={preferences?.favorite_cuisines ?? []}
      macroGoals={preferences?.macro_goals ?? []}
    />
  )
}
