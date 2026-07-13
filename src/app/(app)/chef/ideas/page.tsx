import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import ChefAddMenu from '@/components/chef/ChefAddMenu'
import ChefSwipeableBody from '@/components/chef/ChefSwipeableBody'
import { getChefContext } from '@/lib/chefData'
import IdeasResults from './IdeasResults'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ChefIdeasPage({ searchParams }: Props) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const { q } = await searchParams
  const context = await getChefContext(supabase, profile.household_id)

  return (
    <AppBackground>
      <PageHeader title="Recipe Ideas" backHref="/chef" rightAction={<ChefAddMenu />}>
        <ChefTabs />
      </PageHeader>
      <ChefSwipeableBody>
        <div style={{ padding: '20px 20px 0' }}>
          <IdeasResults
            key={q ?? 'none'}
            inventory={context.inventory}
            defaultServings={context.defaultServings}
            query={q}
            householdId={profile.household_id}
            userId={user.id}
          />
        </div>
      </ChefSwipeableBody>
    </AppBackground>
  )
}
