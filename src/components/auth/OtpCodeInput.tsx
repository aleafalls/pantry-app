'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface Props {
  value: string
  onChange: (value: string) => void
  onComplete: () => void
  disabled?: boolean
  autoFocus?: boolean
}

// This project's Supabase Auth settings issue 8-digit email OTP codes
// (Authentication → Providers → Email → "OTP Length" — configurable
// per-project, not the 6-digit default assumed elsewhere). Keep this in
// sync with that setting; every other length in this file derives from it.
export const OTP_LENGTH = 8

// Numeric code entry — auto-verifies as soon as OTP_LENGTH digits are
// present (covers both mail-app autofill and manual entry), never re-fires
// while a verify from a previous completion is still in flight (disabled=true).
export default function OtpCodeInput({ value, onChange, onComplete, disabled, autoFocus }: Props) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (value.length === OTP_LENGTH && !disabled && !firedRef.current) {
      firedRef.current = true
      onComplete()
    }
    if (value.length < OTP_LENGTH) firedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the code value or disabled state changes
  }, [value, disabled])

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={OTP_LENGTH}
      required
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={'0'.repeat(OTP_LENGTH)}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
      className="rounded-xl text-center"
      style={{ color: 'var(--foreground)', fontSize: 22, letterSpacing: '0.3em', fontWeight: 700 }}
    />
  )
}
