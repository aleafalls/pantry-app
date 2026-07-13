'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ChefTabs from '@/components/chef/ChefTabs'
import ChefAddMenu from '@/components/chef/ChefAddMenu'
import ChefSwipeableBody from '@/components/chef/ChefSwipeableBody'
import OnHandToggle from '@/components/chef/OnHandToggle'
import type { InventoryItem } from '@/lib/chefData'
import TonightResults from './TonightResults'

interface Props {
  inventory: InventoryItem[]
  priorityItems: string[]
  defaultServings: number
  householdId: string
  userId: string
}

export default function TonightPageContent({ inventory, priorityItems, defaultServings, householdId, userId }: Props) {
  const [strictOnly, setStrictOnly] = useState(true)

  return (
    <>
      <PageHeader title="What to Make Tonight" backHref="/chef" rightAction={<ChefAddMenu />}>
        <ChefTabs />
        <OnHandToggle strictOnly={strictOnly} onToggle={() => setStrictOnly(v => !v)} />
      </PageHeader>
      <ChefSwipeableBody>
        <div style={{ padding: '20px 20px 0' }}>
          <TonightResults
            inventory={inventory}
            priorityItems={priorityItems}
            defaultServings={defaultServings}
            strictOnly={strictOnly}
            householdId={householdId}
            userId={userId}
          />
        </div>
      </ChefSwipeableBody>
    </>
  )
}
