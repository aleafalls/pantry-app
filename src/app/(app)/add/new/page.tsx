'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from '@/components/ui/select'
import QuantityStepper from '@/components/add/QuantityStepper'
import LocationSelector from '@/components/add/LocationSelector'
import TagInput from '@/components/add/TagInput'
import SuccessScreen from '@/components/add/SuccessScreen'
import { CATEGORIES, UNITS_GROUPED } from '@/lib/constants'

function NewItemForm() {
  const searchParams = useSearchParams()
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('pantry')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [lowThreshold, setLowThreshold] = useState(2)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('household_id').eq('id', user.id).single()
        .then(({ data }) => setHouseholdId(data?.household_id ?? null))
    })
  }, [])

  const isValid = name.trim() && category && location && unit && quantity > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !householdId || !userId) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const itemId = crypto.randomUUID()

    const { error: itemError } = await supabase.from('items').insert({
      id: itemId,
      household_id: householdId,
      name: name.trim(),
      category,
      default_unit: unit,
      low_threshold: lowThreshold,
      tags,
      active: true,
    })

    if (itemError) { setError(itemError.message); setLoading(false); return }

    const { error: invError } = await supabase.from('inventory').insert({
      household_id: householdId,
      item_id: itemId,
      location,
      quantity,
      unit,
      purchase_date: purchaseDate,
      added_by: userId,
    })

    if (invError) { setError(invError.message); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>
        <SuccessScreen itemName={name.trim()} detail={`${quantity} ${unit} added to ${location}`} />
      </div>
    )
  }

  const inputStyle = {
    background: 'oklch(100% 0 0 / 0.6)',
    borderColor: 'oklch(100% 0 0 / 0.5)',
    color: 'var(--foreground)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>

      <PageHeader title="New item" backHref="/add" />

      <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" style={{ color: 'var(--foreground)' }}>Item name</Label>
          <Input id="name" type="text" required autoFocus placeholder="e.g. Almond Butter"
            value={name} onChange={e => setName(e.target.value)}
            className="rounded-xl py-3 text-sm" style={inputStyle} />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <Label style={{ color: 'var(--foreground)' }}>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl py-3 text-sm h-auto" style={inputStyle}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <LocationSelector value={location} onChange={setLocation} />

        {/* Quantity */}
        <QuantityStepper value={quantity} onChange={setQuantity} label="Quantity" />

        {/* Unit */}
        <div className="flex flex-col gap-2">
          <Label style={{ color: 'var(--foreground)' }}>Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="rounded-xl py-3 text-sm h-auto" style={inputStyle}>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UNITS_GROUPED).map(([group, units]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {units.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Purchase date */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="date" style={{ color: 'var(--foreground)' }}>Purchase date</Label>
          <Input id="date" type="date" value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
            className="rounded-xl py-3 text-sm" style={inputStyle} />
        </div>

        {/* Low threshold */}
        <QuantityStepper value={lowThreshold} onChange={setLowThreshold} min={0}
          label="Alert me when below" />

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <Label style={{ color: 'var(--foreground)' }}>Tags <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></Label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

        <Button type="submit" variant="brand" disabled={loading || !isValid}
          style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '14px 16px', marginTop: 8 }}>
          {loading ? 'Saving…' : 'Save item'}
        </Button>
      </form>
    </div>
  )
}

export default function NewItemPage() {
  return <Suspense><NewItemForm /></Suspense>
}
