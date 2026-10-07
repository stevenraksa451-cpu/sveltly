// app/api/mailboxes/callback/route.ts
// Callback du flux OAuth dédié à l'ajout d'une boîte Gmail supplémentaire
// (voir /api/mailboxes/connect). Google redirige ici le navigateur — donc pas
// d'en-tête Authorization possible ; l'identité de l'utilisateur vient
// uniquement du state signé émis au départ du flux. Écrit avec la clé
// service-role car il n'y a pas de session Supabase dans ce contexte
// (l'utilisateur a déjà été vérifié via le state avant tout accès à la base).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptToken, decryptStrict } from '@/lib/token-crypto'
import { invalidateEmailCache } from '@/lib/email-cache'
import { getPlan } from '@/lib/plans'

function redirectWithStatus(origin: string, status: 'connected' | 'error', message?: string) {
  const url = new URL('/settings', origin)
  url.searchParams.set('mailbox', status)
  if (message) url.searchParams.set('mailbox_error', message)
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
    // decryptStrict (pas decryptToken) : un state qui n'est pas un texte
    // chiffré valide doit être rejeté, jamais traité comme du JSON en clair
    // de confiance — sinon n'importe qui peut forger {"uid":"<victime>",...}
    // et rattacher sa propre boîte Gmail au compte d'un autre utilisateur.
    const decrypted = decryptStrict(state)
    if (!decrypted) throw new Error('state invalide')
    const payload = JSON.parse(decrypted)
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) throw new Error('state expiré')
    uid = payload.uid
  } catch {
    return redirectWithStatus(req.url, 'error', 'session expirée, réessayez')
  }

  const redirectUri = `${req.nextUrl.origin}/api/mailboxes/callback`
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
    console.error('Erreur échange code OAuth mailbox:', tokenData.error)
    return redirectWithStatus(req.url, 'error', 'échange du code impossible')
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = await userInfoRes.json()
  if (!userInfo.email) {
    return redirectWithStatus(req.url, 'error', 'email introuvable')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Re-vérifie la limite de boîtes mail ICI, au moment réel de l'écriture —
  // /api/mailboxes/connect ne fait qu'un contrôle préalable avant de générer
  // l'URL Google : le state signé reste valable 10 minutes et rien n'empêche
  // de relancer plusieurs fois le consentement Google avec des comptes
  // différents pendant cette fenêtre. Sans ce second contrôle, un utilisateur
  // gratuit pouvait donc connecter plus de boîtes que sa limite. Reconnecter
  // une boîte déjà existante (même email) reste toujours autorisé, même au
  //-delà de la limite — seul l'AJOUT d'une boîte supplémentaire est bloqué.
  const { data: existingMailbox } = await supabaseAdmin
    .from('mailboxes')
    .select('id')
    .eq('user_id', uid)
    .eq('email', userInfo.email)
    .maybeSingle()

  if (!existingMailbox) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan')
      .eq('id', uid)
      .single()
    const { count } = await supabaseAdmin
      .from('mailboxes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)

    const mailboxLimit = getPlan(profile?.plan).limits.mailboxes
    if (mailboxLimit !== null && (count ?? 0) >= mailboxLimit) {
      return redirectWithStatus(req.url, 'error', 'limite de boîtes mail atteinte pour ce forfait')
    }
  }

  const { error: upsertError } = await supabaseAdmin.from('mailboxes').upsert({
    user_id: uid,
    provider: 'gmail',
    email: userInfo.email,
    label: 'Gmail',
    access_token: encryptToken(tokenData.access_token),
    ...(tokenData.refresh_token ? { refresh_token: encryptToken(tokenData.refresh_token) } : {}),
    is_connected: true,
  }, { onConflict: 'user_id,email' })

  if (upsertError) {
    console.error('Erreur upsert mailbox:', upsertError.message)
    return redirectWithStatus(req.url, 'error', 'enregistrement impossible')
  }

  invalidateEmailCache(uid)
  return redirectWithStatus(req.url, 'connected')
}
