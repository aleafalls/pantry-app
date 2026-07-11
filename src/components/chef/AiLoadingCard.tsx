interface Props {
  label: string
}

const RELAY_EMOJIS = ['🍓', '🍗', '🥛', '🥫', '🧀']
const CYCLE_SECONDS = 7.5

export default function AiLoadingCard({ label }: Props) {
  return (
    <div
      className="rounded-14 px-4 py-8 flex flex-col items-center gap-3 text-center"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(120deg, var(--surface), color-mix(in srgb, var(--yellow-light) 35%, var(--surface)), var(--surface))',
        backgroundSize: '200% 200%',
        animation: 'ai-card-gradient 4s ease-in-out infinite',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 200, height: 30 }}>
        {RELAY_EMOJIS.map((emoji, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', top: '50%', fontSize: 22, lineHeight: 1,
              transform: 'translateY(-50%)',
              animation: `food-emoji-relay ${CYCLE_SECONDS}s linear infinite`,
              animationDelay: `${i * (CYCLE_SECONDS / RELAY_EMOJIS.length)}s`,
              animationFillMode: 'backwards',
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
      <p className="text-sm" style={{ color: 'var(--muted)', margin: 0 }}>{label}</p>
    </div>
  )
}
