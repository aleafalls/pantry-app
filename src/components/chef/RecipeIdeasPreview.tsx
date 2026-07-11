'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RecipeIdeaSearchBox from './RecipeIdeaSearchBox'

export default function RecipeIdeasPreview() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleGo() {
    const trimmed = query.trim()
    router.push(trimmed ? `/chef/ideas?q=${encodeURIComponent(trimmed)}` : '/chef/ideas')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-135 font-extrabold uppercase tracking-003" style={{ color: 'var(--foreground)' }}>
        Recipe ideas
      </span>

      {/* Same yellow gradient + sheen treatment as the Dashboard's "What to
          Cook Now" card — draws the eye since this section is a
          user-initiated search, not something we prefetch or preview. */}
      <RecipeIdeaSearchBox
        value={query}
        onChange={setQuery}
        onSubmit={handleGo}
        instructionText={'Search for recipes with specific ingredients as inspo, a concept like "vegetarian pasta" or "instant pot meal", or just tap Go to see some ideas with what\'s on hand.'}
      />
    </div>
  )
}
