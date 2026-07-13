export interface TimeBucket {
  value: string
  label: string
}

export const TIME_BUCKETS: TimeBucket[] = [
  { value: 'under-30', label: 'Under 30 min' },
  { value: '30-60', label: '30–60 min' },
  { value: 'over-60', label: 'Over 60 min' },
]

export function matchesTimeBucket(minutes: number | null, bucket: string): boolean {
  if (minutes == null) return false
  switch (bucket) {
    case 'under-30': return minutes < 30
    case '30-60': return minutes >= 30 && minutes <= 60
    case 'over-60': return minutes > 60
    default: return false
  }
}
