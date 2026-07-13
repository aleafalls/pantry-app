'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { InventoryItem } from '@/lib/chefData'
import CookView from './CookView'
import PlanView from './PlanView'
import EditView from './EditView'

export interface RecipeIngredientData {
  id: string
  name: string
  quantity: string | null
  unit: string | null
}

export interface RecipeData {
  id: string
  name: string
  emoji: string | null
  course_type: string | null
  tags: string[] | null
  servings: number | null
  total_time_minutes: number | null
  instructions: string | null
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

      <div style={{ padding: '20px 20px 0' }}>
        {tab === 'cook' && <CookView recipe={recipe} ingredients={ingredients} />}
        {tab === 'plan' && (
          <PlanView
            ingredients={ingredients}
            inventory={inventory}
            householdId={householdId}
            userId={userId}
          />
        )}
        {tab === 'edit' && (
          <EditView
            recipe={recipe}
            ingredients={ingredients}
            onSaved={() => setTab('cook')}
          />
        )}
      </div>
    </>
  )
}
