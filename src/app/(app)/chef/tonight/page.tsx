import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import { getChefContext } from '@/lib/chefData'
import TonightPageContent from './TonightPageContent'

export default async function ChefTonightPage() {
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
      <TonightPageContent
        inventory={context.inventory}
        priorityItems={context.priorityItems}
        defaultServings={context.defaultServings}
      />
    </AppBackground>
  )
}
