'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import OnHandToggle from '@/components/chef/OnHandToggle'
import type { InventoryItem } from '@/lib/chefData'
import TonightResults from './TonightResults'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
}

export default function TonightPageContent({ inventory, priorityItems, defaultServings }: Props) {
  const [strictOnly, setStrictOnly] = useState(true)

  return (
    <>
      <PageHeader title="What to Make Tonight" backHref="/chef">
        <ChefTabs />
        <OnHandToggle strictOnly={strictOnly} onToggle={() => setStrictOnly(v => !v)} />
      </PageHeader>
      <div style={{ padding: '20px 20px 0' }}>
        <TonightResults
          inventory={inventory}
          priorityItems={priorityItems}
          defaultServings={defaultServings}
          strictOnly={strictOnly}
        />
      </div>
    </>
  )
}
