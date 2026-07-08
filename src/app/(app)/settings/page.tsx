import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_emoji, household_id, households(id, name, invite_code, city, state, default_servings, owner_id)')
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
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji')
    .eq('household_id', profile.household_id)
    .order('display_name')

  return (
    <SettingsClient
      userId={user.id}
      displayName={profile.display_name ?? ''}
      avatarEmoji={profile.avatar_emoji}
      household={household}
      members={members ?? []}
    />
  )
}
