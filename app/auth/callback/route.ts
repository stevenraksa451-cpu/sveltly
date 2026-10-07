import { NextRequest, NextResponse } from 'next/server'
import { encryptToken } from '@/lib/token-crypto'

export async function GET(req: NextRequest) {
  // Supabase passe le code ici
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    // Pas de code = redirection directe vers une page client
    // qui va gérer le fragment #access_token
    return NextResponse.redirect(new URL('/auth/callback/client', req.url))
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) console.error('Erreur exchangeCodeForSession:', error.message)

  if (!error && data.session?.provider_token) {
    // provider_refresh_token manquait ici (contrairement à /api/save-token,
    // l'autre chemin possible selon que Supabase renvoie un "code" ou un
    // fragment #access_token) : sans lui, le mailbox perd tout accès Gmail
    // dès l'expiration de l'access_token (~1h), silencieusement — aucune
    // erreur visible, la boîte semble juste arrêter de se synchroniser.
    const { error: upsertError } = await supabase.from('mailboxes').upsert({
      user_id: data.session.user.id,
      provider: 'gmail',
      email: data.session.user.email,
      label: 'Gmail',
      access_token: encryptToken(data.session.provider_token),
      ...(data.session.provider_refresh_token ? { refresh_token: encryptToken(data.session.provider_refresh_token) } : {}),
      is_connected: true,
    }, { onConflict: 'user_id,email' })
    if (upsertError) console.error('Erreur upsert mailbox (callback code):', upsertError.message)
  }

  return NextResponse.redirect(new URL('/dashboard', req.url))
}