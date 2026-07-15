import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HouseholdClient from './HouseholdClient'

export default async function HouseholdSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id, households(id, name, invite_code, city, state, default_servings, owner_id, shopping_tier)')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const household = profile.households as unknown as {
    id: string
    name: string
    invite_code: string
    city: string | null
    state: string | null
    default_servings: number
    owner_id: string | null
    shopping_tier: number
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji')
    .eq('household_id', profile.household_id)
    .order('display_name')

  return (
    <HouseholdClient
      userId={user.id}
      household={household}
      members={members ?? []}
    />
  )
}
