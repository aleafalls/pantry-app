import Link from 'next/link'

const glassCard: React.CSSProperties = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  background: 'var(--glass-card)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
}

// Same yellow/teal pairing as AppBackground's decorative page blobs, at
// similarly light opacity, blended into the page background color — gives
// the fallback hero tile a soft sense of depth instead of a flat fill.
const heroGradient = 'linear-gradient(135deg, color-mix(in srgb, #FFDD55 16%, var(--background)), color-mix(in srgb, #23967F 12%, var(--background)))'

export interface RecipeCardData {
  id: string
  name: string
  emoji: string | null
  imageUrl: string | null
  source: string
  matchPercent: number
}

const SOURCE_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  web: { icon: 'fi-rr-globe', label: 'From the web', color: 'var(--orange)' },
  social: { icon: 'fi-rr-globe', label: 'From the web', color: 'var(--orange)' },
  ai: { icon: 'fi-sr-sparkles', label: 'Lemmy Idea', color: 'var(--amber)' },
  manual: { icon: 'fi-rr-user', label: 'My Recipe', color: 'var(--muted)' },
  photo: { icon: 'fi-rr-user', label: 'My Recipe', color: 'var(--muted)' },
}

function badgeStyle(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 8px', borderRadius: 99,
    background: 'oklch(99% 0.003 85 / 0.85)',
    backdropFilter: 'blur(4px)',
    fontSize: 11, fontWeight: 700, color: 'var(--foreground)',
  }
}

export default function RecipeCard({ id, name, emoji, imageUrl, source, matchPercent }: RecipeCardData) {
  const badge = SOURCE_BADGES[source] ?? SOURCE_BADGES.manual

  return (
    <Link
      href={`/chef/${id}`}
      className="flex flex-col rounded-14 overflow-hidden"
      style={{
        aspectRatio: '1 / 1',
        textDecoration: 'none',
        ...glassCard,
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ flex: 1, minHeight: 0, background: imageUrl ? undefined : heroGradient }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external/user-supplied recipe photo URLs, not a local/static asset
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 40, lineHeight: 1 }}>{emoji ?? '🍽️'}</span>
        )}

        <span style={{ position: 'absolute', top: 8, left: 8, ...badgeStyle() }}>
          <i className={badge.icon} style={{ fontSize: 10, display: 'block', lineHeight: 1, color: badge.color }} />
          {badge.label}
        </span>

        <span
          style={{
            position: 'absolute', top: 8, right: 8,
            padding: '4px 8px', borderRadius: 99,
            background: 'color-mix(in srgb, var(--teal) 25%, white)',
            fontSize: 11, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1,
          }}
        >
          {matchPercent}%
        </span>
      </div>

      <div style={{ padding: '8px 10px' }}>
        <span
          className="text-13 font-bold"
          style={{
            color: 'var(--foreground)', lineHeight: 1.3, height: '33.8px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </span>
      </div>
    </Link>
  )
}

function AddOptionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, flex: 1, padding: 8, textDecoration: 'none',
        borderRadius: 14, ...glassCard, border: '1.5px dashed var(--divider)',
      }}
    >
      <i className={icon} style={{ fontSize: 16, display: 'block', color: 'var(--muted)' }} />
      <span className="text-11 font-bold" style={{ color: 'var(--muted)', lineHeight: 1.2, textAlign: 'center' }}>
        {label}
      </span>
    </Link>
  )
}

export function AddRecipeCard() {
  return (
    <div className="flex flex-col gap-2" style={{ aspectRatio: '1 / 1' }}>
      <AddOptionButton href="/chef/new" icon="fi-rr-edit" label="Manually Add Recipe" />
      <AddOptionButton href="/chef/import" icon="fi-rr-download" label="Import Recipe" />
    </div>
  )
}
