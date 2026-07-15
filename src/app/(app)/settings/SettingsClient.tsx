'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AppBackground from '@/components/layout/AppBackground'
import { Input } from '@/components/ui/input'
import EmojiPicker, { AVATAR_EMOJI_GROUPS } from '@/components/ui/EmojiPicker'

interface Props {
  userId: string
  displayName: string
  avatarEmoji: string | null
}

export default function SettingsClient({ userId, displayName, avatarEmoji }: Props) {
  const router = useRouter()

  const [yourName, setYourName] = useState(displayName)
  const [emoji, setEmoji] = useState(avatarEmoji)

  async function saveYourName() {
    const trimmed = yourName.trim()
    if (!trimmed || trimmed === displayName) return
    const supabase = createClient()
    await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
    router.refresh()
  }

  async function saveAvatarEmoji(val: string) {
    setEmoji(val)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar_emoji: val }).eq('id', userId)
    router.refresh()
  }

  const sectionLabel = (label: string) => (
    <div style={{ padding: '8px 0 4px' }}>
      <span className="text-11 font-extrabold uppercase tracking-003" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <AppBackground>
      <PageHeader title="Settings" backHref="/" />

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {sectionLabel('Your name')}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            type="text"
            value={yourName}
            onChange={e => setYourName(e.target.value)}
            onBlur={saveYourName}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="rounded-xl text-sm flex-1"
            style={{ color: 'var(--foreground)' }}
          />
          <EmojiPicker
            value={emoji}
            onChange={saveAvatarEmoji}
            groups={AVATAR_EMOJI_GROUPS}
            fallback="🙂"
            searchPlaceholder="Search avatar emojis…"
          />
        </div>

      </div>
    </AppBackground>
  )
}
