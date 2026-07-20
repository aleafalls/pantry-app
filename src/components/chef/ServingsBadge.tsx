'use client'

interface Props {
  servings: number
  onClick: () => void
}

// Yellow + minus/plus hints signal this pill is interactive, unlike the
// neutral MetaPills (course type, total time) it sits alongside on Cook —
// same "−"/fi-rr-plus pairing QuantityStepper and CompactStepper use.
export default function ServingsBadge({ servings, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full text-11 font-bold"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
        color: '#4A3300',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>−</span>
      {servings} serving{servings === 1 ? '' : 's'}
      <i className="fi-rr-plus" style={{ fontSize: 9, display: 'block', lineHeight: 1 }} />
    </button>
  )
}
