'use client'

import type { InventoryItem } from '@/lib/chefData'
import IngredientStockPlanner from '@/components/chef/IngredientStockPlanner'
import type { RecipeIngredientData } from './RecipeTabs'

interface Props {
  ingredients: RecipeIngredientData[]
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

export default function PlanView({ ingredients, inventory, householdId, userId }: Props) {
  return (
    <IngredientStockPlanner
      ingredients={ingredients}
      inventory={inventory}
      householdId={householdId}
      userId={userId}
    />
  )
}
