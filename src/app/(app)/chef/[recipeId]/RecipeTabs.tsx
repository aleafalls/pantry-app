'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs'
import type { InventoryItem } from '@/lib/chefData'
import { agreeUnit, scaleQuantity } from '@/lib/quantity'
import CookView from './CookView'
import PlanView from './PlanView'
import EditView from './EditView'
import ServingsDrawer from './ServingsDrawer'

export interface RecipeIngredientData {
  id: string
  name: string
  quantity: string | null
  unit: string | null
  canonical_name: string | null
  category: string | null
  is_staple: boolean
}

export interface RecipeData {
  id: string
  name: string
  emoji: string | null
  course_type: string | null
  tags: string[] | null
  servings: number | null
  preferred_servings: number | null
  total_time_minutes: number | null
  instructions: string | null
  source_url: string | null
  image_url: string | null
}

interface Props {
  recipe: RecipeData
  ingredients: RecipeIngredientData[]
  inventory: InventoryItem[]
  householdId: string
  userId: string
}

const TABS = [
  { value: 'cook', label: 'Cook' },
  { value: 'plan', label: 'Plan' },
  { value: 'edit', label: 'Edit' },
]

export default function RecipeTabs({ recipe, ingredients, inventory, householdId, userId }: Props) {
  const [tab, setTab] = useState('cook')
  const activeIndex = TABS.findIndex(t => t.value === tab)
  const bind = useSwipeableTabs(activeIndex, TABS.length, index => setTab(TABS[index].value))

  const [servings, setServings] = useState(recipe.preferred_servings ?? recipe.servings ?? 2)
  const [servingsDrawerOpen, setServingsDrawerOpen] = useState(false)

  // Re-sync after the recipe's own stored servings/override actually
  // change — e.g. an Edit-tab save clears preferred_servings server-side
  // and router.refresh()es this page, but a plain useState initializer
  // only runs on first mount, so without this the badge would keep
  // showing the pre-edit value until a manual reload.
  useEffect(() => {
    setServings(recipe.preferred_servings ?? recipe.servings ?? 2)
  }, [recipe.servings, recipe.preferred_servings])

  // recipe.servings is the fixed baseline the ingredient quantities were
  // written for — it's what scaling divides by, not the adjustable value.
  // When it's missing (older recipes without a servings count), there's no
  // reliable base to scale from, so ingredients render unscaled.
  const baseServings = recipe.servings
  const scaleFactor = baseServings && baseServings > 0 ? servings / baseServings : 1
  const scaledIngredients = useMemo(
    () => ingredients.map(ing => {
      const quantity = scaleQuantity(ing.quantity, scaleFactor)
      return { ...ing, quantity, unit: agreeUnit(ing.unit, quantity) }
    }),
    [ingredients, scaleFactor]
  )

  return (
    <>
      <PageHeader title={recipe.name} backHref="/chef/saved">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {TABS.map(t => {
              const isActive = t.value === tab
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  style={isActive ? {
                    backdropFilter: 'blur(14px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                    border: '1px solid oklch(100% 0 0 / 0.6)',
                    background: 'var(--glass-card)',
                    boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
                    color: 'var(--foreground)',
                    fontWeight: 700,
                  } : {
                    background: 'transparent',
                    color: 'var(--muted)',
                    fontWeight: 500,
                  }}
                >
                  {t.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </PageHeader>

      <div {...bind()} style={{ padding: '20px 20px 0' }}>
        {tab === 'cook' && (
          <CookView
            recipe={recipe}
            ingredients={scaledIngredients}
            servings={servings}
            onOpenServingsDrawer={() => setServingsDrawerOpen(true)}
          />
        )}
        {tab === 'plan' && (
          <PlanView
            ingredients={scaledIngredients}
            inventory={inventory}
            householdId={householdId}
            userId={userId}
            servings={servings}
            onOpenServingsDrawer={() => setServingsDrawerOpen(true)}
          />
        )}
        {tab === 'edit' && (
          <EditView
            recipe={recipe}
            ingredients={ingredients}
            householdId={householdId}
            onSaved={(newServings) => { setServings(newServings); setTab('cook') }}
          />
        )}
      </div>

      <ServingsDrawer
        open={servingsDrawerOpen}
        onOpenChange={setServingsDrawerOpen}
        servings={servings}
        onServingsChange={setServings}
        recipeId={recipe.id}
        householdId={householdId}
      />
    </>
  )
}
