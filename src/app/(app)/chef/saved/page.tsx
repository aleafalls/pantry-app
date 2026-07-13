import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppBackground from '@/components/layout/AppBackground'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import ChefAddMenu from '@/components/chef/ChefAddMenu'

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

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, course_type, servings, total_time_minutes')
    .eq('household_id', profile.household_id)
    .order('created_at', { ascending: false })

  return (
    <AppBackground>
      <PageHeader title="Saved Recipes" backHref="/chef" rightAction={<ChefAddMenu />}>
        <ChefTabs />
      </PageHeader>
      <div style={{ padding: '20px 20px 0' }}>
        {recipes && recipes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recipes.map(recipe => (
              <Link
                key={recipe.id}
                href={`/chef/${recipe.id}`}
                className="flex items-center justify-between rounded-14 px-4 py-3"
                style={{ background: 'var(--surface)', textDecoration: 'none' }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{recipe.name}</span>
                <div className="flex gap-2">
                  {recipe.course_type && (
                    <span className="text-105" style={{ color: 'var(--muted)' }}>{recipe.course_type}</span>
                  )}
                  {recipe.total_time_minutes && (
                    <span className="text-105" style={{ color: 'var(--muted)' }}>{recipe.total_time_minutes} min</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-14 px-4 py-8 flex flex-col items-center gap-2 text-center" style={{ background: 'var(--surface)' }}>
            <i className="fi-rr-bookmark" style={{ fontSize: 22, color: 'var(--muted)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>No saved recipes yet</p>
            <p className="text-105" style={{ color: 'var(--muted)' }}>
              Recipes you save from Recipe Ideas or the web will show up here.
            </p>
          </div>
        )}
      </div>
    </AppBackground>
  )
}
