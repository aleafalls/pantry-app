'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { InventoryItem } from '@/lib/chefData'
import type { MealIdea } from '@/lib/mealIdeas'
import { findAndImportRecipe } from '@/lib/findRecipe'
import IngredientStockPlanner from './IngredientStockPlanner'

interface Props {
  recipeIdea: MealIdea | null
  onOpenChange: (open: boolean) => void
  inventory: InventoryItem[]
  defaultServings: number
  householdId: string
  userId: string
}

export default function RecipeIdeaDetailSheet({ recipeIdea, onOpenChange, inventory, defaultServings, householdId, userId }: Props) {
  return (
    <Sheet open={!!recipeIdea} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {recipeIdea && (
          <RecipeIdeaDetailBody
            key={recipeIdea.idea}
            recipeIdea={recipeIdea}
            inventory={inventory}
            defaultServings={defaultServings}
            householdId={householdId}
            userId={userId}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface BodyProps {
  recipeIdea: MealIdea
  inventory: InventoryItem[]
  defaultServings: number
  householdId: string
  userId: string
}

function RecipeIdeaDetailBody({ recipeIdea, inventory, defaultServings, householdId, userId }: BodyProps) {
  const router = useRouter()
  const [findingRecipe, setFindingRecipe] = useState<'searching' | 'reading' | null>(null)
  const [findError, setFindError] = useState<string | null>(null)

  async function handleFindRecipe() {
    setFindError(null)
    const keyIngredients = recipeIdea.ingredients.filter(i => !i.is_staple).map(i => i.name).slice(0, 4)
    const outcome = await findAndImportRecipe(recipeIdea.idea, keyIngredients, stage => setFindingRecipe(stage))
    setFindingRecipe(null)
    if (outcome.status === 'success') {
      router.push('/chef/new')
    } else if (outcome.status === 'not_found') {
      setFindError("Couldn't find a good match for this online — try a different idea.")
    } else if (outcome.status === 'import_failed') {
      setFindError(outcome.message)
    } else {
      setFindError('Something went wrong — try again.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{recipeIdea.idea}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{recipeIdea.description}</p>
        <p className="text-105" style={{ color: 'var(--muted)' }}>Serves {defaultServings}</p>
      </div>

      <button
        type="button"
        onClick={handleFindRecipe}
        disabled={!!findingRecipe}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 16px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: '#4A3300', fontSize: 15, fontWeight: 700,
          cursor: findingRecipe ? 'default' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {findingRecipe && (
          <i className="fi-rr-rotate-right" style={{ fontSize: 14, display: 'block', lineHeight: 1, animation: 'spin 1s linear infinite' }} />
        )}
        {findingRecipe === 'searching' && 'Finding a recipe…'}
        {findingRecipe === 'reading' && 'Reading the recipe…'}
        {!findingRecipe && 'Find a Full Recipe'}
      </button>
      <p className="text-105" style={{ color: 'var(--muted)', margin: 0 }}>
        Searches for a real, chef-sourced recipe matching this idea and brings it in for you to review and save.
      </p>
      {findError && (
        <p className="text-sm" style={{ color: 'var(--red)', margin: 0 }}>{findError}</p>
      )}

      <IngredientStockPlanner
        ingredients={recipeIdea.ingredients.map(ing => ({ name: ing.name, quantity: null, unit: null }))}
        inventory={inventory}
        householdId={householdId}
        userId={userId}
      />
    </div>
  )
}
