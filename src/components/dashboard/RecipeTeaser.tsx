'use client'

import { useState } from 'react'

export default function RecipeTeaser() {
  const [showSoon, setShowSoon] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowSoon(true)}
        className="relative w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 overflow-hidden text-left"
        style={{
          background: 'linear-gradient(135deg, #FFD333, #FFE680)',
          border: '1px solid oklch(100% 0 0 / 0.5)',
          boxShadow: '0 1px 0 oklch(100% 0 0 / 0.6) inset, 0 6px 16px -10px #FFD33399',
        }}
      >
        {/* Sheen */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-30%', left: '-10%',
            width: '60%', height: '160%',
            background: 'linear-gradient(120deg, oklch(100% 0 0 / 0.55), oklch(100% 0 0 / 0))',
            transform: 'rotate(-12deg)',
          }}
        />

        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center text-[19px] shrink-0"
          style={{
            background: 'oklch(99% 0.01 85 / 0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid oklch(100% 0 0 / 0.6)',
          }}
        >
          🍳
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold" style={{ color: '#4A3300' }}>
            What can I make?
          </span>
          <span className="text-xs" style={{ color: '#7A5200' }}>
            Get recipes from what you have
          </span>
        </div>

        <span className="ml-auto text-lg" style={{ color: '#7A5200' }}>›</span>
      </button>

      {/* Coming soon sheet */}
      {showSoon && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowSoon(false)}
          style={{ background: 'oklch(0% 0 0 / 0.4)' }}
        >
          <div
            className="w-full max-w-[390px] mx-auto rounded-t-3xl px-6 pt-6 pb-10"
            onClick={e => e.stopPropagation()}
            style={{ background: 'oklch(97% 0.006 85)' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--divider)' }} />
            <div className="text-3xl mb-3 text-center">🍳</div>
            <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: 'var(--foreground)' }}>
              Recipe suggestions coming soon
            </h2>
            <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
              Once your pantry is stocked, we&apos;ll suggest recipes based on what you have.
            </p>
            <button
              onClick={() => setShowSoon(false)}
              className="mt-6 w-full py-3 rounded-xl text-sm font-bold"
              style={{
                background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
                color: '#4A3300',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
