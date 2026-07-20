'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import QuantityStepper from '@/components/add/QuantityStepper'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  servings: number
  onServingsChange: (value: number) => void
  recipeId: string
  householdId: string
}

export default function ServingsDrawer({ open, onOpenChange, servings, onServingsChange, recipeId, householdId }: Props) {
  const [draft, setDraft] = useState(servings)
  const [saving, setSaving] = useState(false)

  // Re-seed the draft from the last committed value every time the drawer
  // opens, so swiping it away without tapping either button leaves no trace.
  useEffect(() => {
    if (open) setDraft(servings)
  }, [open, servings])

  function saveOnce() {
    onServingsChange(draft)
    onOpenChange(false)
  }

  async function savePermanently() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('recipes')
      .update({ preferred_servings: draft })
      .eq('id', recipeId)
      .eq('household_id', householdId)
    setSaving(false)
    if (error) {
      toast.error("Couldn't save that — try again.")
      return
    }
    onServingsChange(draft)
    onOpenChange(false)
    toast.success(`This recipe will default to ${draft} servings from now on.`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-6 pb-10"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none' }}>
        <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: 'var(--foreground)' }}>
          Adjust servings
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
          Scales the ingredient amounts shown on Cook and Plan.
        </p>

        <div className="flex justify-center mb-6">
          <div style={{ width: 180 }}>
            <QuantityStepper value={draft} onChange={setDraft} min={1} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={saveOnce}
            disabled={saving}
            style={{
              padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
              color: '#4A3300', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer',
            }}
          >
            Save Once
          </button>
          <button
            type="button"
            onClick={savePermanently}
            disabled={saving}
            style={{
              padding: '14px', borderRadius: 12,
              border: '1.5px solid var(--divider)', background: 'none',
              color: 'var(--foreground)', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save Permanently'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
