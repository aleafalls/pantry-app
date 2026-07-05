import Link from 'next/link'

interface Props {
  title: string
  backHref: string
}

export default function PageHeader({ title, backHref }: Props) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'oklch(99% 0.003 85 / 0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.4)',
      }}
    >
      <Link
        href={backHref}
        style={{ color: 'var(--muted)', textDecoration: 'none', flexShrink: 0, lineHeight: 1 }}
        aria-label="Go back"
      >
        <i className="fi-rr-angle-left" style={{ fontSize: 18, display: 'block' }} />
      </Link>
      <h1 className="text-base font-extrabold truncate" style={{ color: 'var(--foreground)' }}>
        {title}
      </h1>
    </div>
  )
}
