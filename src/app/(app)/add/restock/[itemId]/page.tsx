import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RestockForm from './RestockForm'

interface Props {
  params: Promise<{ itemId: string }>
}

export default async function RestockPage({ params }: Props) {
  const { itemId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: item } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('active', true)
    .single()

  if (!item) redirect('/add')

  const { data: inventoryRows } = await supabase
    .from('inventory')
    .select('*')
    .eq('item_id', itemId)

  return (
    <RestockForm
      item={item}
      inventoryRows={inventoryRows ?? []}
      userId={user.id}
    />
  )
}
