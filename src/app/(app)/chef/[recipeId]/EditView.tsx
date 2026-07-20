'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import DrawerSelect from '@/components/ui/DrawerSelect'
import EmojiPicker from '@/components/ui/EmojiPicker'
import QuantityStepper from '@/components/add/QuantityStepper'
import TagInput from '@/components/add/TagInput'
import IngredientRows, { type RecipeIngredientRow } from '@/components/chef/IngredientRows'
import { COURSE_TYPES } from '@/lib/constants'
import { canonicalizeIngredients } from '@/lib/ingredientCanonicalize'
import { fetchRecipeTagSuggestions } from '@/lib/tagSuggestions'
import type { RecipeData, RecipeIngredientData } from './RecipeTabs'

const glassField = {
  background: 'oklch(100% 0 0 / 0.6)',
  borderColor: 'oklch(100% 0 0 / 0.5)',
  color: 'var(--foreground)',
}

const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365 * 10 // 10 years — long enough to read as permanent

interface Props {
  recipe: RecipeData
  ingredients: RecipeIngredientData[]
  householdId: string
  onSaved: (newServings: number) => void
}

export default function EditView({ recipe, ingredients: initialIngredients, householdId, onSaved }: Props) {
  const router = useRouter()

  const [name, setName] = useState(recipe.name)
  const [emoji, setEmoji] = useState(recipe.emoji ?? '🍽️')
  const [courseType, setCourseType] = useState(recipe.course_type ?? '')
  const [tags, setTags] = useState<string[]>(recipe.tags ?? [])
  const [servings, setServings] = useState(recipe.servings ?? 4)
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number | ''>(recipe.total_time_minutes ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>(
    initialIngredients.map(ing => ({ name: ing.name, quantity: ing.quantity ?? '', unit: ing.unit ?? '' }))
  )
  const [instructions, setInstructions] = useState(recipe.instructions ?? '')
  const [imageUrl, setImageUrl] = useState(recipe.image_url)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

  useEffect(() => {
    fetchRecipeTagSuggestions(householdId).then(setTagSuggestions)
  }, [householdId])

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
        emoji,
        course_type: courseType || null,
        tags,
        servings,
        // A manual edit can rewrite servings and every ingredient quantity
        // together, so any "always make N of this" override from the Cook/
        // Plan servings drawer no longer applies against the new baseline.
        preferred_servings: null,
        total_time_minutes: totalTimeMinutes || null,
        instructions: instructions.trim() || null,
        image_url: imageUrl,
      }).eq('id', recipe.id).eq('household_id', householdId)
      if (recipeError) throw new Error(recipeError.message)

      const { error: deleteError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id)
      if (deleteError) throw new Error(deleteError.message)

      const canonicalized = await canonicalizeIngredients(ingredients.map(ing => ing.name))

      const { error: insertError } = await supabase.from('recipe_ingredients').insert(
        ingredients.map((ing, i) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          canonical_name: canonicalized[i]?.canonicalName ?? null,
          category: canonicalized[i]?.category ?? null,
          is_staple: canonicalized[i]?.isStaple ?? false,
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
      // Pass the just-saved servings value directly rather than relying on
      // the router.refresh() re-fetch to land before this renders — in
      // testing that refresh didn't reliably deliver fresh props in time,
      // leaving the Cook/Plan badge showing the pre-edit servings count.
      onSaved(servings)
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setRemoving(true)
    const supabase = createClient()
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id).eq('household_id', householdId)
    if (error) {
      toast.error(error.message)
      setRemoving(false)
      return
    }
    router.push('/chef/saved')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after an error
    if (!file) return
    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      toast.error('Please use a JPG, PNG, WEBP, or GIF photo.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('That photo is too large — try a smaller image.')
      return
    }

    setUploadingPhoto(true)
    const supabase = createClient()
    const ext = file.type.split('/')[1] ?? 'jpg'
    const path = `${householdId}/${recipe.id}-${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('recipe-photos')
      .upload(path, file, { contentType: file.type })
    if (uploadError) {
      toast.error(uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('recipe-photos')
      .createSignedUrl(path, SIGNED_URL_SECONDS)
    setUploadingPhoto(false)
    if (signError || !signed?.signedUrl) {
      toast.error(signError?.message ?? "Couldn't load that photo.")
      return
    }
    setImageUrl(signed.signedUrl)
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

      {imageUrl ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- external/user-supplied recipe photo URL, not a local/static asset */}
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            aria-label="Remove photo"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'oklch(20% 0 0 / 0.55)', color: '#fff',
            }}
          >
            <i className="fi-rr-cross-small" style={{ fontSize: 14, display: 'block' }} />
          </button>
        </div>
      ) : (
        <div
          style={{
            position: 'relative', borderRadius: 14, height: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'oklch(100% 0 0 / 0.4)',
            border: '1.5px dashed oklch(60% 0.02 85 / 0.4)',
          }}
        >
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 99,
              padding: '12px 16px',
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300', fontWeight: 700, cursor: uploadingPhoto ? 'default' : 'pointer',
            }}
          >
            <i
              className={uploadingPhoto ? 'fi-rr-rotate-right' : 'fi-rr-camera'}
              style={{ fontSize: 16, display: 'block', animation: uploadingPhoto ? 'spin 1s linear infinite' : 'none' }}
            />
            {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Input
          type="text"
          required
          placeholder="Recipe name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="font-extrabold text-lg"
          style={{ color: 'var(--foreground)', flex: 1 }}
        />
        <EmojiPicker value={emoji} onChange={setEmoji} fallback="🍽️" />
      </div>

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
        <TagInput tags={tags} onChange={setTags} suggestions={tagSuggestions} />
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
