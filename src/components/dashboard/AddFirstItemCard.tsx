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
        boxShadow: '0 1px 0 oklch(100% 0 0 / 0.6) inset, 0 6px 16px -10px #FFD33399',
      }}
    >
      {/* Sheen overlay */}
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        top: '-30%', left: '-10%', width: '60%', height: '160%',
        background: 'linear-gradient(120deg, oklch(100% 0 0 / 0.55), oklch(100% 0 0 / 0))',
        transform: 'rotate(-12deg)',
      }} />

      {/* Icon */}
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

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4A3300' }}>
          Add your first item
        </span>
        <span style={{ fontSize: 12, color: '#7A5200' }}>
          Start tracking what&apos;s in your pantry
        </span>
      </div>

      <span style={{ marginLeft: 'auto', fontSize: 18, color: '#7A5200' }}>›</span>
    </Link>
  )
}
