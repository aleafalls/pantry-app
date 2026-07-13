'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/chefData'
import type { RecipeIdea } from '@/lib/recipeIdeas'
import IngredientStockPlanner from './IngredientStockPlanner'

interface Props {
  recipeIdea: RecipeIdea | null
  onOpenChange: (open: boolean) => void
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

export default function RecipeIdeaDetailSheet({ recipeIdea, onOpenChange, inventory, householdId, userId }: Props) {
  return (
    <Sheet open={!!recipeIdea} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {recipeIdea && (
          <RecipeIdeaDetailBody
            key={recipeIdea.recipe_name}
            recipeIdea={recipeIdea}
            inventory={inventory}
            householdId={householdId}
            userId={userId}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface BodyProps {
  recipeIdea: RecipeIdea
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

function RecipeIdeaDetailBody({ recipeIdea, inventory, householdId, userId }: BodyProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const supabase = createClient()
    const recipeId = crypto.randomUUID()

    const savePromise = (async () => {
      const { error: recipeError } = await supabase.from('recipes').insert({
        id: recipeId,
        household_id: householdId,
        name: recipeIdea.recipe_name,
        emoji: recipeIdea.emoji,
        source: 'ai',
        servings: recipeIdea.servings,
        instructions: recipeIdea.instructions,
        created_by: userId,
      })
      if (recipeError) throw new Error(recipeError.message)

      const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(
        recipeIdea.ingredients.map(ing => ({
          recipe_id: recipeId,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
        }))
      )
      if (ingredientsError) throw new Error(ingredientsError.message)

      return recipeId
    })()

    setSaving(true)
    toast.promise(savePromise, {
      loading: `Saving ${recipeIdea.recipe_name}…`,
      success: (id) => ({
        message: `${recipeIdea.recipe_name} saved!`,
        action: { label: 'View recipe', onClick: () => router.push(`/chef/${id}`) },
      }),
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    savePromise
      .then(() => setSaved(true))
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{recipeIdea.recipe_name}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{recipeIdea.description}</p>
        <p className="text-105" style={{ color: 'var(--muted)' }}>Serves {recipeIdea.servings}</p>
      </div>

      <IngredientStockPlanner
        ingredients={recipeIdea.ingredients}
        inventory={inventory}
        householdId={householdId}
        userId={userId}
      />

      <div className="flex flex-col gap-1">
        <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
          Instructions
        </span>
        <p className="text-105 whitespace-pre-wrap" style={{ color: 'var(--foreground)', lineHeight: 1.6 }}>
          {recipeIdea.instructions}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || saved}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 16px', borderRadius: 14, border: 'none',
          background: saved ? 'var(--surface)' : 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: saved ? 'var(--foreground)' : '#4A3300',
          fontSize: 15, fontWeight: 700, cursor: saving || saved ? 'default' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {saved && <i className="fi-sr-check" style={{ fontSize: 14, display: 'block', lineHeight: 1 }} />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save to My Recipes'}
      </button>
    </div>
  )
}
