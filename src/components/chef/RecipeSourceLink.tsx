interface Props {
  url: string
  label?: string
}

// Derives a friendly site name straight from the URL ("heartfoundation.org.au")
// rather than trying to further truncate to a bare "domain.tld" — multi-part
// TLDs (.org.au, .co.uk, .com.br, ...) can't be trimmed correctly without a
// full public-suffix-list, so showing the whole registrable hostname (minus
// "www.") is the version that's never wrong.
function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'View original recipe'
  }
}

// Full-width glass-style link to the real recipe a page/photo/search result
// was imported from — shared across the New Recipe form and the saved
// recipe's Cook view so "where did this come from" always looks the same.
export default function RecipeSourceLink({ url, label }: Props) {
  const displayLabel = label ?? hostnameLabel(url)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-14"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        width: '100%', padding: '12px 16px',
        textDecoration: 'none',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid oklch(100% 0 0 / 0.6)',
        background: 'var(--glass-card)',
        boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 4px 14px -8px',
      }}
    >
      <span className="text-115 font-semibold" style={{ color: 'var(--foreground)' }}>{displayLabel}</span>
      <i className="fi-rr-arrow-up-right-from-square" style={{ fontSize: 13, display: 'block', color: 'var(--muted)', flexShrink: 0 }} />
    </a>
  )
}
