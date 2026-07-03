export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-4xl mb-4">🥫</div>
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--foreground)' }}>
        Pantry
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
        Dashboard coming soon
      </p>
    </div>
  )
}
