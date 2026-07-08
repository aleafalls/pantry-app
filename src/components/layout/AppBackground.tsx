/**
 * Shared page wrapper for all secondary app screens.
 * Provides the warm background + two decorative blobs that match the
 * dashboard's visual style at slightly lower opacity so secondary pages
 * feel cohesive without competing with the home screen.
 */
export default function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 112, background: 'var(--background)', position: 'relative' }}>

      {/* Decorative blobs — fixed so they don't scroll, same palette as dashboard */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: -60, left: -50, width: 220, height: 220,
          background: '#FFDD55', filter: 'blur(50px)', opacity: 0.16,
        }} />
        <div style={{
          position: 'absolute', borderRadius: '50%',
          top: 120, right: -60, width: 180, height: 180,
          background: '#23967F', filter: 'blur(55px)', opacity: 0.12,
        }} />
      </div>

      {/* Content sits above blobs; sticky headers inside use their own z-index: 10 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
