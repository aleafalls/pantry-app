'use client'

import { useState } from 'react'
import { useDrag } from '@use-gesture/react'

const PULL_THRESHOLD = 70
const MAX_PULL = 100

interface Props {
  children: React.ReactNode
  onRefresh: () => Promise<void>
}

export default function PullToRefresh({ children, onRefresh }: Props) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const bind = useDrag(({ movement: [, my], last, event }) => {
    if (refreshing || window.scrollY > 0 || my <= 0) {
      if (last) setPull(0)
      return
    }
    // We're genuinely pulling down from the top — stop the native
    // scroll/overscroll so our own indicator drives the motion instead.
    event.preventDefault()

    const clamped = Math.min(my, MAX_PULL)
    if (!last) {
      setPull(clamped)
      return
    }
    if (clamped >= PULL_THRESHOLD) {
      setRefreshing(true)
      setPull(PULL_THRESHOLD)
      onRefresh().finally(() => { setRefreshing(false); setPull(0) })
    } else {
      setPull(0)
    }
  }, { axis: 'y', filterTaps: true })

  const indicatorHeight = refreshing ? 44 : pull

  return (
    <div {...bind()}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: indicatorHeight,
          overflow: 'hidden',
          transition: pull === 0 || refreshing ? 'height 0.2s ease' : 'none',
        }}
      >
        <i
          className="fi-rr-refresh"
          style={{
            fontSize: 18, display: 'block', lineHeight: 1, color: 'var(--amber)',
            opacity: refreshing ? 1 : Math.min(1, pull / PULL_THRESHOLD),
            transform: refreshing ? 'none' : `rotate(${pull * 3}deg)`,
            animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
          }}
        />
      </div>
      {children}
    </div>
  )
}
