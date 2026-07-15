'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchRecipeImport, fetchRecipePhotoImport, setRecipeImportDraft } from '@/lib/recipeImport'

export default function ImportRecipePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // `disabled={loading}` on the button isn't enough on its own — React state
  // updates aren't synchronous, so a fast double-click can fire both submit
  // events before the re-render actually disables the DOM element. This ref
  // is set synchronously, so the second submit bails out immediately instead
  // of sending a duplicate import request.
  const submittingRef = useRef(false)

  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    const trimmed = url.trim()
    if (!trimmed) return
    submittingRef.current = true
    setLoading(true)
    setError(null)

    const result = await fetchRecipeImport(trimmed)
    submittingRef.current = false
    setLoading(false)

    if (result.error || !result.data) {
      setError(result.error ?? "Couldn't import that recipe.")
      return
    }
    setRecipeImportDraft(result.data)
    router.push('/chef/new')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after an error
    if (!file || submittingRef.current) return
    submittingRef.current = true
    setPhotoLoading(true)
    setPhotoError(null)

    const result = await fetchRecipePhotoImport(file)
    submittingRef.current = false
    setPhotoLoading(false)

    if (result.error || !result.data) {
      setPhotoError(result.error ?? "Couldn't read that photo.")
      return
    }
    setRecipeImportDraft(result.data)
    router.push('/chef/new')
  }

  return (
    <AppBackground>
      <PageHeader title="Import Recipe" backHref="/chef/saved" />

      <form onSubmit={handleImport} style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Paste a link to a recipe and we&apos;ll pull in the ingredients and instructions for you to review before saving.
        </p>

        <Input
          type="url"
          required
          autoFocus
          placeholder="https://example.com/recipe"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="rounded-xl text-sm"
          style={{
            background: 'oklch(100% 0 0 / 0.6)',
            borderColor: 'oklch(100% 0 0 / 0.5)',
            color: 'var(--foreground)',
          }}
        />

        {error && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        <Button
          type="submit"
          variant="brand"
          disabled={loading || !url.trim()}
          style={{
            background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
            color: '#4A3300',
            padding: '14px 16px',
          }}
        >
          {loading ? 'Importing…' : 'Import Recipe'}
        </Button>
      </form>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span className="text-13" style={{ color: 'var(--muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '28px 16px', width: '100%',
            background: 'oklch(100% 0 0 / 0.4)',
            border: '1.5px dashed oklch(60% 0.02 85 / 0.4)',
            borderRadius: 16, cursor: photoLoading ? 'default' : 'pointer',
          }}
        >
          <i
            className={photoLoading ? 'fi-rr-rotate-right' : 'fi-rr-camera'}
            style={{ fontSize: 22, display: 'block', color: 'var(--amber)', animation: photoLoading ? 'spin 1s linear infinite' : 'none' }}
          />
          <span className="text-13" style={{ color: 'var(--foreground)', fontWeight: 600 }}>
            {photoLoading ? 'Reading your recipe…' : 'Take or upload a photo'}
          </span>
          <span className="text-11" style={{ color: 'var(--muted)' }}>
            A cookbook page, recipe card, or printout
          </span>
        </button>

        {photoError && (
          <p className="text-sm" style={{ color: 'var(--red)', margin: 0 }}>{photoError}</p>
        )}
      </div>
    </AppBackground>
  )
}
