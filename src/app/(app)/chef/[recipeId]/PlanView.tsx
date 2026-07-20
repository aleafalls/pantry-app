'use client'

import type { InventoryItem } from '@/lib/chefData'
import IngredientStockPlanner from '@/components/chef/IngredientStockPlanner'
import ServingsBadge from '@/components/chef/ServingsBadge'
import type { RecipeIngredientData } from './RecipeTabs'

interface Props {
  ingredients: RecipeIngredientData[]
  inventory: InventoryItem[]
  householdId: string
  userId: string
  servings: number
  onOpenServingsDrawer: () => void
}

export default function PlanView({ ingredients, inventory, householdId, userId, servings, onOpenServingsDrawer }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <ServingsBadge servings={servings} onClick={onOpenServingsDrawer} />
      </div>
      <IngredientStockPlanner
        ingredients={ingredients}
        inventory={inventory}
        householdId={householdId}
        userId={userId}
      />
    </div>
  )
}
