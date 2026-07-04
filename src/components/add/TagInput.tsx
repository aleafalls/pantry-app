'use client'

import { useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('')

  function commit() {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      commit()
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
                style={{ fontSize: 14, lineHeight: 1, color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        type="text"
        placeholder="Type a tag, then press space or comma"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        className="rounded-xl py-3 text-sm"
        style={{ background: 'oklch(100% 0 0 / 0.6)', borderColor: 'oklch(100% 0 0 / 0.5)', color: 'var(--foreground)' }}
      />
    </div>
  )
}
