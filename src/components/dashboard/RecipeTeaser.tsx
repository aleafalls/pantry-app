'use client'

import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export default function RecipeTeaser() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 16,
          overflow: 'hidden', position: 'relative',
          width: '100%', boxSizing: 'border-box',
          textAlign: 'left', cursor: 'pointer',
          border: '1px solid oklch(100% 0 0 / 0.5)',
          background: 'linear-gradient(135deg, #FFD333, #FFE680)',
          boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
        }}
      >
        {/* Sheen — z-index 0 so content renders above it */}
        <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 0, top: '-30%', left: '-10%', width: '60%', height: '160%', background: 'linear-gradient(120deg, oklch(100% 0 0 / 0.55), oklch(100% 0 0 / 0))', transform: 'rotate(-12deg)' }} />

        {/* Content sits above sheen */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div className="shrink-0 flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 11, fontSize: 19, background: 'oklch(99% 0.01 85 / 0.55)', backdropFilter: 'blur(6px)', border: '1px solid oklch(100% 0 0 / 0.6)' }}>
            🍳
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold" style={{ color: '#4A3300' }}>What can I make?</span>
            <span className="text-xs" style={{ color: '#7A5200' }}>Get recipes from what you have</span>
          </div>

          <i className="fi-rr-arrow-right" style={{ marginLeft: 'auto', fontSize: 16, display: 'block', lineHeight: 1, color: '#7A5200', flexShrink: 0 }} />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-6 pb-10"
          style={{ background: 'oklch(97% 0.006 85)', border: 'none' }}>
          <div className="text-3xl mb-3 text-center">🍳</div>
          <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: 'var(--foreground)' }}>
            Recipe suggestions coming soon
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
            Once your pantry is stocked, we&apos;ll suggest recipes based on what you have.
          </p>
          <Button variant="brand" onClick={() => setOpen(false)}
            style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '12px 16px' }}>
            Got it
          </Button>
        </SheetContent>
      </Sheet>
    </>
  )
}
