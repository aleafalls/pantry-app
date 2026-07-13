'use client'

import { useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'

export interface RecipeIngredientRow {
  name: string
  quantity: string
  unit: string
}

interface Props {
  ingredients: RecipeIngredientRow[]
  onChange: (ingredients: RecipeIngredientRow[]) => void
}

const fieldStyle = {
  background: 'oklch(100% 0 0 / 0.6)',
  borderColor: 'oklch(100% 0 0 / 0.5)',
  color: 'var(--foreground)',
}

export default function IngredientRows({ ingredients, onChange }: Props) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')

  function commit() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onChange([...ingredients, { name: trimmedName, quantity: quantity.trim(), unit: unit.trim() }])
    setName('')
    setQuantity('')
    setUnit('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !name && !quantity && !unit && ingredients.length > 0) {
      onChange(ingredients.slice(0, -1))
    }
  }

  function removeAt(index: number) {
    onChange(ingredients.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ingredients.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ingredients.map((ing, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 12,
              background: 'var(--surface)',
            }}>
              <span className="text-sm font-medium" style={{ flex: 1, color: 'var(--foreground)' }}>
                {ing.name}
              </span>
              {(ing.quantity || ing.unit) && (
                <span className="text-105" style={{ color: 'var(--muted)' }}>
                  {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                style={{ display: 'flex', lineHeight: 1, color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                <i className="fi-rr-cross-small" style={{ fontSize: 14, display: 'block' }} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          type="text"
          placeholder="Ingredient"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded-xl text-sm"
          style={{ ...fieldStyle, flex: 2 }}
        />
        <Input
          type="text"
          placeholder="Qty"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded-xl text-sm"
          style={{ ...fieldStyle, flex: 1 }}
        />
        <Input
          type="text"
          placeholder="Unit"
          value={unit}
          onChange={e => setUnit(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded-xl text-sm"
          style={{ ...fieldStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!name.trim()}
          aria-label="Add ingredient"
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--yellow)', color: '#4A3300',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            opacity: name.trim() ? 1 : 0.4,
          }}
        >
          <i className="fi-rr-plus" style={{ fontSize: 14, display: 'block' }} />
        </button>
      </div>
    </div>
  )
}
