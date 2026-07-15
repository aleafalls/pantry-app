'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

export default function ChefAddMenu() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add recipe"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--muted)', lineHeight: 1, display: 'block',
          }}
        >
          <i className="fi-rr-plus" style={{ fontSize: 18, display: 'block' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => router.push('/chef/new')}
          className="text-sm"
          style={{ cursor: 'pointer' }}
          onFocus={e => (e.currentTarget.style.background = 'oklch(96% 0.006 85)')}
          onBlur={e => (e.currentTarget.style.background = 'transparent')}
          onMouseEnter={e => (e.currentTarget.style.background = 'oklch(96% 0.006 85)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Manually Add Recipe
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => router.push('/chef/import')}
          className="text-sm"
          style={{ cursor: 'pointer' }}
          onFocus={e => (e.currentTarget.style.background = 'oklch(96% 0.006 85)')}
          onBlur={e => (e.currentTarget.style.background = 'transparent')}
          onMouseEnter={e => (e.currentTarget.style.background = 'oklch(96% 0.006 85)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Import Recipe from URL
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="text-sm flex flex-col items-start gap-0"
          style={{ cursor: 'not-allowed' }}
        >
          <span>Scan a Recipe</span>
          <span className="text-11" style={{ color: 'var(--muted)' }}>Coming soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
