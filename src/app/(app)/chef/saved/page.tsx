import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'

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

  return (
    <AppBackground>
      <PageHeader title="Saved Recipes" backHref="/chef">
        <ChefTabs />
      </PageHeader>
      <div style={{ padding: '20px 20px 0' }}>
        <div className="rounded-14 px-4 py-8 flex flex-col items-center gap-2 text-center" style={{ background: 'var(--surface)' }}>
          <i className="fi-rr-bookmark" style={{ fontSize: 22, color: 'var(--muted)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>No saved recipes yet</p>
          <p className="text-105" style={{ color: 'var(--muted)' }}>
            Recipes you save from Recipe Ideas or the web will show up here.
          </p>
        </div>
      </div>
    </AppBackground>
  )
}
