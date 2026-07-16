'use client'

import { Input } from '@/components/ui/input'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  instructionText: string
}

export default function RecipeIdeaSearchBox({ value, onChange, onSubmit, instructionText }: Props) {
  return (
    <div
      className="flex flex-col gap-3"
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '18px 18px 20px', borderRadius: 14,
        border: '1px solid oklch(100% 0 0 / 0.5)',
        background: 'linear-gradient(135deg, #FFD333, #FFE680)',
        boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
      }}
    >
      <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 0, top: '-30%', left: '-10%', width: '60%', height: '160%', background: 'linear-gradient(120deg, oklch(100% 0 0 / 0.55), oklch(100% 0 0 / 0))', transform: 'rotate(-12deg)' }} />

      <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            type="text"
            placeholder="What do you want to make?"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
            className="rounded-xl text-sm"
            style={{
              background: 'oklch(100% 0 0 / 0.6)',
              borderColor: 'oklch(100% 0 0 / 0.5)',
              color: '#4A3300',
              padding: '10px 14px 10px 36px',
            }}
          />
          <i className="fi-rr-sparkles" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#7A5200' }} />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'oklch(100% 0 0 / 0.85)',
            color: '#4A3300', fontWeight: 700, fontSize: 13, border: 'none',
            borderRadius: 12, padding: '10px 18px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Go
        </button>
      </div>

      <p className="text-115" style={{ position: 'relative', zIndex: 1, color: '#7A5200', margin: 0, lineHeight: 1.5 }}>
        {instructionText}
      </p>
    </div>
  )
}
