'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  itemName: string
  detail?: string
}

export default function SuccessScreen({ itemName, detail }: Props) {
  const router = useRouter()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '40px 20px', textAlign: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>✅</div>
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>
          {itemName} added!
        </h2>
        {detail && (
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{detail}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 8 }}>
        <Button variant="brand" onClick={() => router.push('/add')}
          style={{ background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))', color: '#4A3300', padding: '12px 16px' }}>
          Add another item
        </Button>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-semibold"
          style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
