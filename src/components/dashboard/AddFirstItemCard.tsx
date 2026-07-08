import Link from 'next/link'

export default function AddFirstItemCard() {
  return (
    <Link
      href="/add"
      style={{
        // Layout — inline to guarantee application on <a> elements
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        textDecoration: 'none',
        // Design
        background: 'linear-gradient(135deg, #FFD333, #FFE680)',
        border: '1px solid oklch(100% 0 0 / 0.5)',
        boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
      }}
    >
      {/* Sheen overlay — z-index 0 so content renders above it */}
      <div style={{
        position: 'absolute', pointerEvents: 'none', zIndex: 0,
        top: '-30%', left: '-10%', width: '60%', height: '160%',
        background: 'linear-gradient(120deg, oklch(100% 0 0 / 0.55), oklch(100% 0 0 / 0))',
        transform: 'rotate(-12deg)',
      }} />

      {/* Content sits above sheen */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
          background: 'oklch(99% 0.01 85 / 0.55)',
          backdropFilter: 'blur(6px)',
          border: '1px solid oklch(100% 0 0 / 0.6)',
        }}>
          🥫
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4A3300' }}>
            Add your first item
          </span>
          <span style={{ fontSize: 12, color: '#7A5200' }}>
            Start tracking what&apos;s in your pantry
          </span>
        </div>

        <i className="fi-rr-plus" style={{ marginLeft: 'auto', fontSize: 16, display: 'block', lineHeight: 1, color: '#7A5200' }} />
      </div>
    </Link>
  )
}
