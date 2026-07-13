import Link from 'next/link'

export default function RecipeTeaser() {
  return (
    <Link
      href="/chef/tonight"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 16,
        overflow: 'hidden', position: 'relative',
        width: '100%', boxSizing: 'border-box',
        textAlign: 'left', cursor: 'pointer', textDecoration: 'none',
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
          🥘
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold" style={{ color: '#4A3300' }}>What can I make tonight?</span>
          <span className="text-xs" style={{ color: '#7A5200' }}>See what to make with what you have</span>
        </div>

        <i className="fi-rr-arrow-right" style={{ marginLeft: 'auto', fontSize: 16, display: 'block', lineHeight: 1, color: '#7A5200', flexShrink: 0 }} />
      </div>
    </Link>
  )
}
