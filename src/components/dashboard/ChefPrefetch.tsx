'use client'

import { useEffect } from 'react'
import { prewarmTonightSuggestions } from '@/lib/chefSuggestions'
import type { InventoryItem } from '@/lib/chefData'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
}

// Renders nothing — fires the "What to Make Tonight" request on Dashboard
// mount so the Chef tab and Tonight page load with results already in hand.
export default function ChefPrefetch({ inventory, priorityItems, defaultServings }: Props) {
  useEffect(() => {
    prewarmTonightSuggestions({ inventory, priorityItems, defaultServings, allowShopping: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount; props come from the server-rendered page and don't change during this component's lifetime
  }, [])

  return null
}
