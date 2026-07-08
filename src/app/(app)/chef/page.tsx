import AppBackground from '@/components/layout/AppBackground'

export default function ChefPage() {
  return (
    <AppBackground>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 16,
        }}>
          <i className="fi-sr-user-chef" style={{ fontSize: 48, display: 'block', lineHeight: 1, color: 'var(--muted)' }} />
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)', marginBottom: 6 }}>
              Chef is coming soon
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)', maxWidth: 260, margin: '0 auto' }}>
              Recipe ideas based on what&apos;s in your pantry will appear here.
            </p>
          </div>
        </div>
      </div>
    </AppBackground>
  )
}
