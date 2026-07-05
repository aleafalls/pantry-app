import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CatalogRestockForm from './CatalogRestockForm'

interface Props {
  searchParams: Promise<{ catalogId?: string }>
}

export default async function CatalogRestockPage({ searchParams }: Props) {
  const { catalogId } = await searchParams
  if (!catalogId) redirect('/add')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: catalogItem }] = await Promise.all([
    supabase.from('profiles').select('household_id').eq('id', user.id).single(),
    supabase.from('catalog').select('*').eq('id', catalogId).single(),
  ])

  if (!catalogItem || !profile?.household_id) redirect('/add')

  return (
    <CatalogRestockForm
      catalogItem={catalogItem}
      householdId={profile.household_id}
      userId={user.id}
    />
  )
}
