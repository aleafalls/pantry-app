'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchRecipeImport, setRecipeImportDraft } from '@/lib/recipeImport'

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
    </AppBackground>
  )
}
