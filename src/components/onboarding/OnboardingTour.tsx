'use client'

import { useState } from 'react'
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs'
import { Button } from '@/components/ui/button'

const GLASS_CARD: React.CSSProperties = {
  background: 'var(--glass-card)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

const SLIDES = [
  {
    emoji: '📦',
    title: 'Track your inventory',
    description: "Add anything to your pantry and track where it's stored, where you buy it, and more.",
  },
  {
    emoji: '🔁',
    title: 'Auto-restock',
    description: 'Flag items to auto-restock and Lemmy builds your shopping list for you.',
  },
  {
    emoji: '👨‍🍳',
    title: 'Recipe ideas',
    description: "Get quick ideas for what to cook with what's on hand, plus step-by-step recipes.",
  },
  {
    emoji: '🔗',
    title: 'Save from the web',
    description: "Import any recipe you find online — we'll add what's missing to your list.",
  },
  {
    emoji: '🏠',
    title: 'Share your household',
    description: 'Invite your household so everyone can add, restock, and cook together.',
  },
]

export default function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const bind = useSwipeableTabs(index, SLIDES.length, setIndex)
  const isLast = index === SLIDES.length - 1

  return (
    <div>
      <div {...bind()} style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          transform: `translateX(-${index * 100}%)`,
          transition: 'transform 280ms ease-out',
        }}>
          {SLIDES.map((slide, i) => (
            <div key={i} style={{
              flex: '0 0 100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '4px 8px 8px',
            }}>
              <div style={{
                ...GLASS_CARD,
                width: 88,
                height: 88,
                borderRadius: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 42,
                marginBottom: 18,
              }}>
                {slide.emoji}
              </div>
              <h2 style={{
                fontSize: 20, fontWeight: 800, margin: '0 0 8px',
                color: 'var(--foreground)', letterSpacing: '-0.01em',
              }}>
                {slide.title}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '18px 0 20px' }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              display: 'block',
              width: i === index ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === index ? 'var(--yellow)' : 'var(--divider)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'width 220ms ease-out, background 220ms ease-out',
            }}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="brand"
        onClick={() => (isLast ? onDone() : setIndex(index + 1))}
        style={{
          background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: '#4A3300',
          padding: '14px 16px',
          fontWeight: 700,
        }}
      >
        {isLast ? 'Get started' : 'Next'}
      </Button>
    </div>
  )
}
