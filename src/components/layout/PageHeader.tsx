import Link from 'next/link'

interface Props {
  title: string
  backHref?: string
  rightAction?: React.ReactNode
  /** Optional content rendered below the title row (e.g. filter pills) */
  children?: React.ReactNode
}

export default function PageHeader({ title, backHref, rightAction, children }: Props) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        padding: children ? '16px 20px 12px' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'oklch(99% 0.003 85 / 0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid oklch(100% 0 0 / 0.4)',
      }}
    >
      {/* Title row — three equal-width columns so title stays centered */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 32, flexShrink: 0 }}>
          {backHref && (
            <Link
              href={backHref}
              style={{ color: 'var(--muted)', textDecoration: 'none', lineHeight: 1, display: 'block' }}
              aria-label="Go back"
            >
              <i className="fi-rr-angle-left" style={{ fontSize: 18, display: 'block' }} />
            </Link>
          )}
        </div>

        <h1
          className="text-base font-extrabold flex-1 text-center truncate"
          style={{ color: 'var(--foreground)' }}
        >
          {title}
        </h1>

        <div style={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          {rightAction}
        </div>
      </div>

      {/* Optional content below — filter pills, search bars, etc. */}
      {children}
    </div>
  )
}
