import { Switch } from '@/components/ui/switch'

interface Props {
  strictOnly: boolean
  onToggle: () => void
}

// Default: use only what's on hand. Toggling this off is what allows
// shopping — the label stays fixed either way so its meaning doesn't
// depend on having already seen the "before" state.
export default function OnHandToggle({ strictOnly, onToggle }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex flex-col gap-0.5" style={{ flex: 1 }}>
        <span className="text-13 font-bold" style={{ color: 'var(--foreground)' }}>
          Use only what I have
        </span>
        <span className="text-105" style={{ color: 'var(--muted)' }}>
          {strictOnly ? 'No shopping required' : 'A couple of minor extras are OK'}
        </span>
      </div>
      <Switch checked={strictOnly} onCheckedChange={() => onToggle()} />
    </div>
  )
}
