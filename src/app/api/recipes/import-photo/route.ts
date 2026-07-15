import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { createClient } from '@/lib/supabase/server'
import { COURSE_TYPES } from '@/lib/constants'

const client = new Anthropic()

const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024 // stays under Claude's base64 image size limit once encoded
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const ImportedRecipeSchema = z.object({
  name: z.string(),
  servings: z.number().nullable(),
  total_time_minutes: z.number().nullable(),
  course_type: z.string().nullable().describe(`Best match to one of: ${COURSE_TYPES.join(', ')} — or null if unclear`),
  tags: z.array(z.string()).describe('A few short descriptive tags (cuisine, diet, etc.) — empty array if none fit'),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.string().describe('e.g. "2", "1 1/2" — empty string if not specified'),
    unit: z.string().describe('e.g. "cups", "tbsp" — empty string if not specified'),
  })),
  instructions: z.array(z.string()).describe('One cooking step per entry, no numbering'),
})

function matchCourseType(value: string | null): string {
  if (!value) return ''
  const match = COURSE_TYPES.find(c => c.toLowerCase() === value.trim().toLowerCase())
  return match ?? ''
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  if (!profile?.household_id) {
    return NextResponse.json({ error: 'No household found.' }, { status: 400 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A photo is required.' }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Please use a JPG, PNG, or WEBP photo.' }, { status: 400 })
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'That photo is too large — try a smaller image.' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  // Best-effort archival copy — extraction below works off the in-memory
  // bytes regardless, so a storage hiccup shouldn't block the import.
  const ext = file.type.split('/')[1] ?? 'jpg'
  const path = `${profile.household_id}/${crypto.randomUUID()}.${ext}`
  supabase.storage.from('recipe-photos').upload(path, bytes, { contentType: file.type })
    .catch(err => console.error('Recipe photo upload failed:', err))

  let parsed: z.infer<typeof ImportedRecipeSchema> | null = null
  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: 'Extract a recipe from the given photo — a cookbook page, recipe card, or printed recipe. If the photo does not contain a recipe, return an empty ingredients array.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: bytes.toString('base64') } },
          { type: 'text', text: 'Extract the recipe from this photo.' },
        ],
      }],
      output_config: { format: zodOutputFormat(ImportedRecipeSchema) },
    })
    parsed = response.parsed_output
  } catch {
    parsed = null
  }

  if (!parsed || !parsed.name.trim() || parsed.ingredients.length === 0) {
    return NextResponse.json({ error: "Couldn't find a recipe in that photo." }, { status: 422 })
  }

  return NextResponse.json({
    name: parsed.name.trim(),
    courseType: matchCourseType(parsed.course_type),
    tags: parsed.tags.slice(0, 6),
    servings: parsed.servings ?? undefined,
    totalTimeMinutes: parsed.total_time_minutes ?? '',
    ingredients: parsed.ingredients,
    instructions: parsed.instructions.join('\n'),
    imageUrl: null,
  })
}
