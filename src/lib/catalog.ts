import { createClient } from '@/lib/supabase/client'

export async function copyCatalogItemToHousehold(
  catalogId: string,
  householdId: string
): Promise<string> {
  const supabase = createClient()
  const newItemId = crypto.randomUUID()

  const { data: catalogItem, error: fetchError } = await supabase
    .from('catalog')
    .select('*')
    .eq('id', catalogId)
    .single()

  if (fetchError || !catalogItem) {
    throw new Error(`Failed to fetch catalog item: ${fetchError?.message}`)
  }

  const { error: insertError } = await supabase.from('items').insert({
    id: newItemId,
    household_id: householdId,
    name: catalogItem.name,
    category: catalogItem.category,
    default_unit: catalogItem.default_unit,
    emoji: catalogItem.emoji,
    low_threshold: 2,
    tags: catalogItem.tags ?? [],
    catalog_id: catalogId,
    active: true,
  })

  if (insertError) {
    throw new Error(`Failed to copy catalog item: ${insertError.message}`)
  }

  return newItemId
}
