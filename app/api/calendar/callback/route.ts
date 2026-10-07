// app/api/calendar/callback/route.ts
// Callback du flux OAuth de connexion du calendrier (voir /api/calendar/connect).
// Même structure que /api/mailboxes/callback : pas de session Supabase possible
// ici (Google redirige le navigateur), l'identité vient uniquement du state signé.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptToken, decryptStrict } from '@/lib/token-crypto'

function redirectWithStatus(origin: string, status: 'connected' | 'error', message?: string) {
  const url = new URL('/settings', origin)
  url.searchParams.set('tab', 'agenda')
  url.searchParams.set('calendar', status)
  if (message) url.searchParams.set('calendar_error', message)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const oauthError = req.nextUrl.searchParams.get('error')

  if (oauthError) return redirectWithStatus(req.url, 'error', 'annulé')
  if (!code || !state) return redirectWithStatus(req.url, 'error', 'requête invalide')

  let uid: string
  try {
    const decrypted = decryptStrict(state)
    if (!decrypted) throw new Error('state invalide')
    const payload = JSON.parse(decrypted)
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) throw new Error('state expiré')
    uid = payload.uid
  } catch {
    return redirectWithStatus(req.url, 'error', 'session expirée, réessayez')
  }

  const redirectUri = `${req.nextUrl.origin}/api/calendar/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    console.error('Erreur échange code OAuth calendar:', tokenData.error)
    return redirectWithStatus(req.url, 'error', 'échange du code impossible')
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = await userInfoRes.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Re-vérifie le forfait ICI, au moment réel de l'écriture — même raison
  // que /api/mailboxes/callback : /api/calendar/connect ne fait qu'un
  // contrôle préalable, et le state signé reste valable 10 minutes (le temps
  // qu'un abonnement expire, ou qu'un state soit réutilisé après une
  // rétrogradation). Sans ce second contrôle, un refresh_token Google
  // Calendar pouvait être stocké pour un compte Gratuit qui n'a pourtant
  // aucun usage légitime de cette fonctionnalité — un jeton stocké sans
  // raison est une surface d'attaque inutile.
  const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', uid).single()
  if (profile?.plan !== 'pro') {
    return redirectWithStatus(req.url, 'error', 'la synchronisation Google Calendar est réservée au forfait Pro')
  }

  const { error: upsertError } = await supabaseAdmin.from('calendar_accounts').upsert({
    user_id: uid,
    provider: 'google',
    email: userInfo.email || null,
    access_token: encryptToken(tokenData.access_token),
    ...(tokenData.refresh_token ? { refresh_token: encryptToken(tokenData.refresh_token) } : {}),
    is_connected: true,
  }, { onConflict: 'user_id,provider' })

  if (upsertError) {
    console.error('Erreur upsert calendar_accounts:', upsertError.message)
    return redirectWithStatus(req.url, 'error', 'enregistrement impossible')
  }

  // calendar_provider pilote l'affichage "Calendrier connecté" dans Réglages
  // > Agenda — 'gmail' est la valeur déjà attendue par ce composant (le type
  // existant y distingue 'gmail' | 'outlook', pas encore 'google' isolément).
  await supabaseAdmin.from('profiles').update({ calendar_provider: 'gmail' }).eq('id', uid)

  return redirectWithStatus(req.url, 'connected')
}
