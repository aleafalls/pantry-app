'use client'

import { useMemo, useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  /** Existing tags (household- or recipe-wide) to offer as autocomplete matches, so near-duplicates like "protein" / "protien" don't pile up. */
  suggestions?: string[]
}

export default function TagInput({ tags, onChange, suggestions = [] }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const matches = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return []
    return suggestions
      .filter(s => s.toLowerCase().includes(q) && !tags.some(t => t.toLowerCase() === s.toLowerCase()))
      .slice(0, 5)
  }, [input, suggestions, tags])

  const showDropdown = focused && matches.length > 0

  function addTag(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    // Reuse the existing tag's casing if this matches one case-insensitively,
    // so "Protein" and "protein" don't become two separate tags.
    const existing = suggestions.find(s => s.toLowerCase() === trimmed.toLowerCase())
    const canonical = existing ?? trimmed
    if (!tags.some(t => t.toLowerCase() === canonical.toLowerCase())) {
      onChange([...tags, canonical])
    }
    setInput('')
    setHighlighted(0)
  }

  function commit() {
    addTag(input)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setHighlighted(prev => (prev + dir + matches.length) % matches.length)
      return
    }
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      if (showDropdown) {
        addTag(matches[highlighted])
      } else {
        commit()
      }
    } else if (e.key === 'Escape') {
      setFocused(false)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 99,
              fontSize: 12, fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--foreground)',
              border: '1px solid var(--divider)',
            }}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{ display: 'flex', lineHeight: 1, color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                <i className="fi-rr-cross-small" style={{ fontSize: 12, display: 'block' }} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Input
          type="text"
          placeholder="Type a tag, then press space or comma"
          value={input}
          onChange={e => { setInput(e.target.value); setHighlighted(0) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { commit(); setFocused(false) }}
          autoComplete="off"
          className="rounded-xl py-3 text-sm"
          style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
        />
        {showDropdown && (
          <div
            className="rounded-xl"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
              background: 'var(--surface)', border: '1px solid var(--divider)',
              boxShadow: '0 4px 16px oklch(0% 0 0 / 0.12)',
              overflow: 'hidden',
            }}
          >
            {matches.map((match, i) => (
              <button
                key={match}
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(match) }}
                className="text-sm"
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', border: 'none', cursor: 'pointer',
                  background: i === highlighted ? 'var(--yellow-light)' : 'transparent',
                  color: 'var(--foreground)',
                  fontWeight: i === highlighted ? 600 : 400,
                  fontFamily: 'inherit',
                }}
              >
                {match}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
