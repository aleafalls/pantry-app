import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite_code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const dest = inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : '/'
      return NextResponse.redirect(`${origin}${dest}`)
    }
    // Surface the real reason instead of silently bouncing back to a blank
    // sign-in form — most commonly a PKCE code-verifier cookie that didn't
    // survive the email link being opened in a different browser context
    // (e.g. an installed PWA vs. the system browser, or an email app's
    // in-app browser) than the one that requested the link.
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent('Missing sign-in code — try requesting a new link.')}`)
}
