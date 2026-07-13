import { useDrag } from '@use-gesture/react'

/**
 * Binds a horizontal swipe gesture to a tab content container. Swiping left
 * advances to the next tab, swiping right goes back — using use-gesture's
 * own velocity/distance-derived `swipe` output rather than hand-rolled
 * thresholds. `filterTaps` keeps ordinary taps/clicks inside the content
 * working normally.
 */
export function useSwipeableTabs(activeIndex: number, count: number, onChange: (index: number) => void) {
  return useDrag(({ swipe: [swipeX], last }) => {
    if (!last || swipeX === 0) return
    if (swipeX < 0 && activeIndex < count - 1) onChange(activeIndex + 1)
    else if (swipeX > 0 && activeIndex > 0) onChange(activeIndex - 1)
  }, { axis: 'x', filterTaps: true })
}
