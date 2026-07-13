'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import DrawerSelect from '@/components/ui/DrawerSelect'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import IngredientRows, { type RecipeIngredientRow } from '@/components/chef/IngredientRows'
import { COURSE_TYPES } from '@/lib/constants'
import type { RecipeData, RecipeIngredientData } from './RecipeTabs'

const glassField = {
  background: 'oklch(100% 0 0 / 0.6)',
  borderColor: 'oklch(100% 0 0 / 0.5)',
  color: 'var(--foreground)',
}

interface Props {
  recipe: RecipeData
  ingredients: RecipeIngredientData[]
  onSaved: () => void
}

export default function EditView({ recipe, ingredients: initialIngredients, onSaved }: Props) {
  const router = useRouter()

  const [name, setName] = useState(recipe.name)
  const [courseType, setCourseType] = useState(recipe.course_type ?? '')
  const [tags, setTags] = useState<string[]>(recipe.tags ?? [])
  const [servings, setServings] = useState(recipe.servings ?? 4)
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number | ''>(recipe.total_time_minutes ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>(
    initialIngredients.map(ing => ({ name: ing.name, quantity: ing.quantity ?? '', unit: ing.unit ?? '' }))
  )
  const [instructions, setInstructions] = useState(recipe.instructions ?? '')

  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isValid = name.trim() && ingredients.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setSaving(true)

    const supabase = createClient()
    const trimmedName = name.trim()

    const savePromise = (async () => {
      const { error: recipeError } = await supabase.from('recipes').update({
        name: trimmedName,
        course_type: courseType || null,
        tags,
        servings,
        total_time_minutes: totalTimeMinutes || null,
        instructions: instructions.trim() || null,
      }).eq('id', recipe.id)
      if (recipeError) throw new Error(recipeError.message)

      const { error: deleteError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id)
      if (deleteError) throw new Error(deleteError.message)

      const { error: insertError } = await supabase.from('recipe_ingredients').insert(
        ingredients.map(ing => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
        }))
      )
      if (insertError) throw new Error(insertError.message)
    })()

    toast.promise(savePromise, {
      loading: `Saving ${trimmedName}…`,
      success: `${trimmedName} updated!`,
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      await savePromise
      router.refresh()
      onSaved()
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setRemoving(true)
    const supabase = createClient()
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (error) {
      toast.error(error.message)
      setRemoving(false)
      return
    }
    router.push('/chef/saved')
  }

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  const detailRow = (key: string, left: React.ReactNode, right: React.ReactNode) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <Input
        type="text"
        required
        placeholder="Recipe name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="font-extrabold text-lg"
        style={{ color: 'var(--foreground)' }}
      />

      {sectionLabel('Details')}

      {detailRow(
        'course-type',
        <Label>Course type</Label>,
        <DrawerSelect
          title="Course Type"
          value={courseType}
          onChange={setCourseType}
          placeholder="Select a course"
          options={COURSE_TYPES.map(c => ({ value: c, label: c }))}
        />
      )}

      {detailRow(
        'servings',
        <Label>Servings</Label>,
        <QuantityStepper value={servings} onChange={setServings} min={1} />
      )}

      {detailRow(
        'total-time',
        <Label>Total time (minutes)</Label>,
        <Input
          type="number"
          min={0}
          placeholder="30"
          value={totalTimeMinutes}
          onChange={e => setTotalTimeMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-xl text-sm text-right"
          style={{ width: 90, color: 'var(--foreground)' }}
        />
      )}

      <div>
        <Label style={{ display: 'block', marginBottom: 8 }}>
          Tags <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
        </Label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {sectionLabel('Ingredients')}
      <IngredientRows ingredients={ingredients} onChange={setIngredients} />

      <div style={{ padding: '8px 0 4px' }}>
        <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
          Instructions
        </span>
        <span className="text-11 font-medium" style={{ color: 'var(--muted)' }}> (optional)</span>
      </div>
      <Textarea
        placeholder="Step-by-step directions…"
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        className="rounded-xl text-sm"
        style={{ ...glassField, minHeight: 160 }}
      />

      <Button
        type="submit"
        variant="brand"
        disabled={saving || !isValid}
        style={{
          background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: '#4A3300',
          padding: '14px 16px',
          marginTop: 8,
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </Button>

      {!confirmDelete ? (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px', color: 'var(--red)', fontSize: 14, fontWeight: 600,
          }}
        >
          Delete recipe
        </button>
      ) : (
        <div style={{
          padding: 16, borderRadius: 14,
          background: 'color-mix(in oklch, #EE1B49 10%, white 90%)',
          border: '1px solid color-mix(in oklch, #EE1B49 30%, white 70%)',
          display: 'flex', flexDirection: 'column', gap: 10,
          marginBottom: 16,
        }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
            Delete {recipe.name}?
          </p>
          <p className="text-11" style={{ color: 'var(--muted)' }}>
            This can&apos;t be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={removing}
              style={{
                flex: 1, padding: 10, borderRadius: 10, border: 'none',
                background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {removing ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1, padding: 10, borderRadius: 10,
                border: '1px solid var(--divider)', background: 'none',
                color: 'var(--foreground)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
