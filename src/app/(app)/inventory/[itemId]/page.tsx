import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ItemDetail from './ItemDetail'

interface Props {
  params: Promise<{ itemId: string }>
}

export default async function InventoryItemPage({ params }: Props) {
  const { itemId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: item }, { data: inventoryRows }] = await Promise.all([
    supabase.from('items').select('*').eq('id', itemId).eq('active', true).single(),
    supabase.from('inventory')
      .select('id, location, quantity, unit, manual_low_flag, added_by, updated_at')
      .eq('item_id', itemId)
      .order('location'),
  ])

  if (!item) redirect('/inventory')

  return (
    <ItemDetail
      item={item}
      inventoryRows={inventoryRows ?? []}
      userId={user.id}
    />
  )
}
