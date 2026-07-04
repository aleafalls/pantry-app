import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import StatCards from '@/components/dashboard/StatCards'
import RecipeTeaser from '@/components/dashboard/RecipeTeaser'
import RunningLow from '@/components/dashboard/RunningLow'
import UseTheseUp from '@/components/dashboard/UseTheseUp'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Profile + household
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, household_id, households(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/onboarding')

  const household = profile.households as unknown as { id: string; name: string }

  // Household members for avatars
  const { data: members } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('household_id', profile.household_id)

  // Inventory with item details
  const { data: inventory } = await supabase
    .from('inventory')
    .select(`
      id, quantity, unit, location, manual_low_flag, purchase_date,
      items!inner(id, name, emoji, low_threshold, active)
    `)
    .eq('household_id', profile.household_id)
    .eq('items.active', true)

  const allInventory = (inventory ?? []) as any[]

  // Total distinct items
  const itemCount = new Set(allInventory.map(i => i.items.id)).size

  // Low / critical items — sorted critical first, then alphabetical
  const lowItems = allInventory
    .filter(inv => inv.quantity <= inv.items.low_threshold || inv.manual_low_flag)
    .sort((a, b) => {
      if (a.quantity === 0 && b.quantity > 0) return -1
      if (b.quantity === 0 && a.quantity > 0) return 1
      return a.items.name.localeCompare(b.items.name)
    })
    .slice(0, 8)

  // Oldest items
  const oldestItems = [...allInventory]
    .filter(inv => inv.purchase_date)
    .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
    .slice(0, 5)

  const isEmpty = itemCount === 0

  return (
    <div
      className="flex flex-col min-h-screen pb-28"
      style={{ background: 'var(--background)' }}
    >
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute rounded-full"
          style={{
            top: '-60px', left: '-50px',
            width: 260, height: 260,
            background: '#FFDD55',
            filter: 'blur(50px)',
            opacity: 0.28,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: 120, right: '-70px',
            width: 220, height: 220,
            background: '#23967F',
            filter: 'blur(55px)',
            opacity: 0.18,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-40px', left: 40,
            width: 240, height: 200,
            background: 'oklch(85% 0.09 30)',
            filter: 'blur(55px)',
            opacity: 0.15,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col">
        <DashboardHeader
          householdName={household.name}
          members={members ?? []}
        />

        <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center text-center pt-20 gap-4">
              <div className="text-5xl">🥫</div>
              <div>
                <h2
                  className="text-lg font-extrabold mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Your pantry is empty
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Add your first item to get started.
                </p>
              </div>
              <a
                href="/add"
                className="mt-2 px-6 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                  color: '#4A3300',
                }}
              >
                Add item
              </a>
            </div>
          ) : (
            <>
              <StatCards itemCount={itemCount} lowCount={lowItems.length} />
              <RecipeTeaser />
              <RunningLow items={lowItems} totalLowCount={lowItems.length} />
              {oldestItems.length > 0 && <UseTheseUp items={oldestItems} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
