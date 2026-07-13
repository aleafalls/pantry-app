'use client'

import DrawerSelect, { SelectOption } from '@/components/ui/DrawerSelect'
import { FilterChip } from '@/components/inventory/InventoryFilterBar'
import { COURSE_TYPES } from '@/lib/constants'
import { TIME_BUCKETS } from '@/lib/recipeTimeBuckets'

interface Props {
  courseTypeFilters: string[]
  onCourseTypeFiltersChange: (values: string[]) => void
  timeFilters: string[]
  onTimeFiltersChange: (values: string[]) => void
  tagFilters: string[]
  onTagFiltersChange: (values: string[]) => void
  tagOptions: string[]
}

const courseTypeOptions: SelectOption[] = COURSE_TYPES.map(c => ({ value: c, label: c }))
const timeOptions: SelectOption[] = TIME_BUCKETS.map(b => ({ value: b.value, label: b.label }))

export default function SavedRecipesFilterBar({
  courseTypeFilters, onCourseTypeFiltersChange,
  timeFilters, onTimeFiltersChange,
  tagFilters, onTagFiltersChange,
  tagOptions,
}: Props) {
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      <DrawerSelect
        title="Course Type"
        multiple
        values={courseTypeFilters}
        onChangeMultiple={onCourseTypeFiltersChange}
        options={courseTypeOptions}
        renderTrigger={open => <FilterChip label="Course type" count={courseTypeFilters.length} onClick={open} />}
      />
      <DrawerSelect
        title="Time"
        multiple
        values={timeFilters}
        onChangeMultiple={onTimeFiltersChange}
        options={timeOptions}
        renderTrigger={open => <FilterChip label="Time" count={timeFilters.length} onClick={open} />}
      />
      <DrawerSelect
        title="Tags"
        multiple
        values={tagFilters}
        onChangeMultiple={onTagFiltersChange}
        options={tagOptions.map(t => ({ value: t, label: t }))}
        renderTrigger={open => <FilterChip label="Tags" count={tagFilters.length} onClick={open} />}
      />
    </div>
  )
}
