import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import StatCards from '@/components/dashboard/StatCards'
import RecipeTeaser from '@/components/dashboard/RecipeTeaser'
import AddFirstItemCard from '@/components/dashboard/AddFirstItemCard'
import RunningLow from '@/components/dashboard/RunningLow'
import UseTheseUp from '@/components/dashboard/UseTheseUp'
import ChefPrefetch from '@/components/dashboard/ChefPrefetch'
import { getChefContext } from '@/lib/chefData'
import { aggregateInventoryByItem, isRunningLow } from '@/lib/lowStock'
import { tracksShelfLife, shelfLifeRatio } from '@/lib/shelfLife'

interface DashboardInventoryRow {
  id: string
  quantity: number
  unit: string
  location: string
  manual_low_flag: boolean
  purchase_date: string | null
  items: {
    id: string
    name: string
    emoji: string | null
    low_threshold: number
    active: boolean
    estimated_price: number | null
    auto_shopping_list: boolean | null
    category: string
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, household_id, households(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const household = profile.households as unknown as { id: string; name: string }

  const [{ data: members }, { data: inventory }, chefContext] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, avatar_emoji')
      .eq('household_id', profile.household_id),
    supabase
      .from('inventory')
      .select(`
        id, quantity, unit, location, manual_low_flag, purchase_date,
        items!inner(id, name, emoji, low_threshold, active, estimated_price, auto_shopping_list, category)
      `)
      .eq('household_id', profile.household_id)
      .eq('items.active', true),
    getChefContext(supabase, profile.household_id),
  ])

  const allInventory = (inventory ?? []) as unknown as DashboardInventoryRow[]
  const itemCount = new Set(allInventory.map(i => i.items.id)).size
  const estValue = allInventory.reduce((sum, inv) => sum + inv.quantity * (inv.items.estimated_price ?? 0), 0)

  const allLowItems = aggregateInventoryByItem(allInventory)
    .filter(isRunningLow)
    .sort((a, b) => {
      if (a.totalQuantity === 0 && b.totalQuantity > 0) return -1
      if (b.totalQuantity === 0 && a.totalQuantity > 0) return 1
      return a.name.localeCompare(b.name)
    })
  const lowItems = allLowItems.slice(0, 8)

  const oldestItems = [...allInventory]
    .filter((inv): inv is DashboardInventoryRow & { purchase_date: string } => Boolean(inv.purchase_date))
    .filter(inv => tracksShelfLife(inv.items.category))
    .sort((a, b) =>
      shelfLifeRatio(b.purchase_date, b.items.category, b.location) -
      shelfLifeRatio(a.purchase_date, a.items.category, a.location))
    .slice(0, 8)

  const isEmpty = itemCount === 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 112, background: 'var(--background)', position: 'relative' }}>
      <ChefPrefetch
        inventory={chefContext.inventory}
        priorityItems={chefContext.priorityItems}
        defaultServings={chefContext.defaultServings}
      />

      {/* Decorative blobs — fixed so they sit behind the sticky header */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: -60, left: -50, width: 260, height: 260,
          background: '#FFDD55', filter: 'blur(50px)', opacity: 0.28,
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: 120, right: -70, width: 220, height: 220,
          background: '#23967F', filter: 'blur(55px)', opacity: 0.18,
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%',
          bottom: -40, left: 40, width: 240, height: 200,
          background: 'oklch(85% 0.09 30)', filter: 'blur(55px)', opacity: 0.15,
        }} />
      </div>

      {/* Page content — z-index above blobs */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        <DashboardHeader
          householdName={household.name}
          members={members ?? []}
        />

        {/* Body — design spec: 14px top, 20px sides, 16px bottom */}
        <div className="flex flex-col gap-4 px-5 pt-14px pb-4">
          <StatCards itemCount={itemCount} lowCount={allLowItems.length} estValue={estValue} />
          {isEmpty ? <AddFirstItemCard /> : <RecipeTeaser />}
          <RunningLow items={lowItems} totalLowCount={allLowItems.length} />
          {oldestItems.length > 0 && <UseTheseUp items={oldestItems} />}
        </div>
      </div>
    </div>
  )
}
