'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
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
import { takeRecipeImportDraft } from '@/lib/recipeImport'
import RecipeSourceLink from '@/components/chef/RecipeSourceLink'
import { canonicalizeIngredients } from '@/lib/ingredientCanonicalize'
import { fetchRecipeTagSuggestions } from '@/lib/tagSuggestions'

const glassField = {
  background: 'oklch(100% 0 0 / 0.6)',
  borderColor: 'oklch(100% 0 0 / 0.5)',
  color: 'var(--foreground)',
}

export default function NewRecipePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [courseType, setCourseType] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [servings, setServings] = useState(4)
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number | ''>('')
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([])
  const [instructions, setInstructions] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [source, setSource] = useState<'manual' | 'web' | 'photo'>('manual')

  const [loading, setLoading] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles')
        .select('household_id')
        .eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (!profile?.household_id) return
          setHouseholdId(profile.household_id)
          fetchRecipeTagSuggestions(profile.household_id).then(setTagSuggestions)
        })
    })
  }, [])

  // Pre-fill from an in-progress web import, if the user just came from
  // /chef/import — read-once, then the draft clears itself.
  useEffect(() => {
    const draft = takeRecipeImportDraft()
    if (!draft) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate the form from a one-shot sessionStorage handoff after mount
    setName(draft.name)
    setCourseType(draft.courseType)
    setTags(draft.tags)
    setServings(draft.servings)
    setTotalTimeMinutes(draft.totalTimeMinutes)
    setIngredients(draft.ingredients)
    setInstructions(draft.instructions)
    setImageUrl(draft.imageUrl)
    setSourceUrl(draft.sourceUrl)
    setSource(draft.source)
  }, [])

  const isValid = name.trim() && ingredients.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !householdId || !userId) return
    setLoading(true)

    const supabase = createClient()
    const recipeId = crypto.randomUUID()
    const trimmedName = name.trim()

    const savePromise = (async () => {
      const { error: recipeError } = await supabase.from('recipes').insert({
        id: recipeId,
        household_id: householdId,
        name: trimmedName,
        emoji,
        course_type: courseType || null,
        tags,
        source,
        source_url: sourceUrl,
        image_url: imageUrl,
        servings,
        total_time_minutes: totalTimeMinutes || null,
        instructions: instructions.trim() || null,
        created_by: userId,
      })
      if (recipeError) throw new Error(recipeError.message)

      const canonicalized = await canonicalizeIngredients(ingredients.map(ing => ing.name))

      const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(
        ingredients.map((ing, i) => ({
          recipe_id: recipeId,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          canonical_name: canonicalized[i]?.canonicalName ?? null,
          category: canonicalized[i]?.category ?? null,
          is_staple: canonicalized[i]?.isStaple ?? false,
        }))
      )
      if (ingredientsError) throw new Error(ingredientsError.message)

      return recipeId
    })()

    toast.promise(savePromise, {
      loading: `Saving ${trimmedName}…`,
      success: (id) => ({
        message: `${trimmedName} saved!`,
        description: `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'} added`,
        action: { label: 'View recipe', onClick: () => router.push(`/chef/${id}`) },
      }),
      error: (err) => err instanceof Error ? err.message : 'Something went wrong',
    })

    try {
      const id = await savePromise
      router.push(`/chef/${id}`)
    } catch {
      // already surfaced via toast.promise's error handler
    } finally {
      setLoading(false)
    }
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
    <AppBackground>
      <PageHeader title="New Recipe" backHref="/chef/saved" />

      <form onSubmit={handleSubmit} style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {imageUrl && (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 160 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        )}

        {sourceUrl && <RecipeSourceLink url={sourceUrl} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            type="text"
            required
            autoFocus
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
          disabled={loading || !isValid}
          style={{
            background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
            color: '#4A3300',
            padding: '14px 16px',
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          {loading ? 'Saving…' : 'Save recipe'}
        </Button>
      </form>
    </AppBackground>
  )
}
