'use client'

import { useState } from 'react'
import { useDrag } from '@use-gesture/react'

const REVEAL_WIDTH = 80
const COMMIT_THRESHOLD = 160

interface Props {
  children: React.ReactNode
  onAction: () => void
  actionLabel: string
  actionIcon: string
  actionColor: string
}

export default function SwipeActionRow({ children, onAction, actionLabel, actionIcon, actionColor }: Props) {
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)

  const bind = useDrag(({ movement: [mx], last, velocity: [vx], direction: [dx] }) => {
    const clamped = Math.min(0, Math.max(mx, -REVEAL_WIDTH * 1.6))
    if (!last) {
      setDragging(true)
      setX(clamped)
      return
    }
    setDragging(false)
    const fastSwipeLeft = vx > 0.5 && dx < 0
    if (clamped < -COMMIT_THRESHOLD || fastSwipeLeft) {
      setX(-500)
      setTimeout(onAction, 180)
    } else if (clamped < -24) {
      setX(-REVEAL_WIDTH)
    } else {
      setX(0)
    }
  }, {
    axis: 'x',
    filterTaps: true,
    bounds: { left: -REVEAL_WIDTH * 1.6, right: 0 },
    rubberband: true,
  })

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Action button, revealed behind the row content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => { setX(0); onAction() }}
          aria-label={actionLabel}
          style={{
            width: REVEAL_WIDTH, border: 'none', background: actionColor, color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}
        >
          <i className={actionIcon} style={{ fontSize: 15, display: 'block', lineHeight: 1 }} />
          {actionLabel}
        </button>
      </div>

      {/* Row content — dragging left reveals the action button; tapping
          while revealed dismisses instead of firing the tap underneath. */}
      <div
        {...bind()}
        onClickCapture={e => {
          if (x !== 0) {
            e.preventDefault()
            e.stopPropagation()
            setX(0)
          }
        }}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          background: 'var(--background)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
