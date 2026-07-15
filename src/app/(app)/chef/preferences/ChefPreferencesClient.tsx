'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Button } from '@/components/ui/button'
import DrawerSelect from '@/components/ui/DrawerSelect'
import { DIETARY_RESTRICTIONS, FAVORITE_CUISINES, MACRO_GOALS } from '@/lib/constants'

interface Props {
  householdId: string
  dietaryRestrictions: string[]
  favoriteCuisines: string[]
  macroGoals: string[]
}

export default function ChefPreferencesClient({
  householdId, dietaryRestrictions, favoriteCuisines, macroGoals,
}: Props) {
  const [dietary, setDietary] = useState<string[]>(dietaryRestrictions)
  const [cuisines, setCuisines] = useState<string[]>(favoriteCuisines)
  const [macros, setMacros] = useState<string[]>(macroGoals)
  const [saving, setSaving] = useState(false)

  async function addCustom(set: (updater: (prev: string[]) => string[]) => void, name: string) {
    set(prev => [...prev, name])
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const savePromise = (async () => {
      const { error } = await supabase.from('household_preferences').upsert({
        household_id: householdId,
        dietary_restrictions: dietary,
        favorite_cuisines: cuisines,
        macro_goals: macros,
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    })()

    toast.promise(savePromise, {
      loading: 'Saving preferences…',
      success: 'Preferences saved!',
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    await savePromise.catch(() => {})
    setSaving(false)
  }

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <AppBackground>
      <PageHeader title="Chef Preferences" backHref="/chef" />

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {sectionLabel('Dietary restrictions')}
        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -12 }}>
          Every restriction here is a hard exclude — Chef will never suggest something that contains it.
        </p>
        <DrawerSelect
          title="Dietary Restrictions"
          multiple
          values={dietary}
          onChangeMultiple={setDietary}
          options={Array.from(new Set([...DIETARY_RESTRICTIONS, ...dietary])).map(d => ({ value: d, label: d }))}
          placeholder="Add restrictions…"
          onAddNew={name => addCustom(setDietary, name)}
          addNewPlaceholder="Add a restriction or allergy…"
        />

        {sectionLabel('Favorite cuisines')}
        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -12 }}>
          Soft preference — Chef leans into these when a good option fits.
        </p>
        <DrawerSelect
          title="Favorite Cuisines"
          multiple
          values={cuisines}
          onChangeMultiple={setCuisines}
          options={Array.from(new Set([...FAVORITE_CUISINES, ...cuisines])).map(c => ({ value: c, label: c }))}
          placeholder="Add cuisines…"
          onAddNew={name => addCustom(setCuisines, name)}
          addNewPlaceholder="Add a cuisine…"
        />

        {sectionLabel('Macro / health goals')}
        <p className="text-11" style={{ color: 'var(--muted)', marginTop: -12 }}>
          Soft preference — qualitative only, not numeric tracking.
        </p>
        <DrawerSelect
          title="Macro / Health Goals"
          multiple
          values={macros}
          onChangeMultiple={setMacros}
          options={Array.from(new Set([...MACRO_GOALS, ...macros])).map(m => ({ value: m, label: m }))}
          placeholder="Add goals…"
          onAddNew={name => addCustom(setMacros, name)}
          addNewPlaceholder="Add a goal…"
        />

        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          <Button
            variant="brand"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300', padding: '14px 16px',
            }}
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>

      </div>
    </AppBackground>
  )
}
