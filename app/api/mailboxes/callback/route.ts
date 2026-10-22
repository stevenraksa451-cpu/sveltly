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
import { boiteAutorisee } from '@/lib/mailbox-quota'
import { GRAPH, MS_AUTHORITY, MS_SCOPES, microsoftCredentials } from '@/lib/outlook-mailbox'

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
  let provider: 'gmail' | 'outlook' = 'gmail'
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
    // Le fournisseur vient du state signé, jamais d'un paramètre d'URL : il
    // décide à quel service on échange le code et sous quelle étiquette la
    // boîte est enregistrée. En clair, il serait modifiable.
    if (payload.provider === 'outlook') provider = 'outlook'
  } catch {
    return redirectWithStatus(req.url, 'error', 'session expirée, réessayez')
  }

  const redirectUri = `${req.nextUrl.origin}/api/mailboxes/callback`

  // Échange du code, puis lecture de l'adresse. Les deux diffèrent d'un
  // fournisseur à l'autre ; tout ce qui suit est commun.
  let tokenData: any
  let adresse: string | null = null

  if (provider === 'outlook') {
    const creds = microsoftCredentials()
    if (!creds) return redirectWithStatus(req.url, 'error', 'connexion Outlook non configurée')

    const tokenRes = await fetch(`${MS_AUTHORITY}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: MS_SCOPES.join(' '),
      }),
    })
    tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Erreur échange code OAuth Microsoft :', tokenData.error_description || tokenData.error)
      return redirectWithStatus(req.url, 'error', 'échange du code impossible')
    }

    const meRes = await fetch(`${GRAPH}/me?$select=mail,userPrincipalName`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const me = await meRes.json()
    // `mail` est vide sur certains comptes (pas de licence Exchange
    // attribuée) ; userPrincipalName fait alors office d'adresse, et c'est
    // celle que Graph utilise de toute façon pour identifier la boîte.
    adresse = me.mail || me.userPrincipalName || null
  } else {
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
    tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Erreur échange code OAuth mailbox:', tokenData.error)
      return redirectWithStatus(req.url, 'error', 'échange du code impossible')
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userInfoRes.json()
    adresse = userInfo.email || null
  }

  if (!adresse) {
    return redirectWithStatus(req.url, 'error', 'email introuvable')
  }
  const userInfo = { email: adresse }

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
  // Règle commune aux trois chemins qui enregistrent une boîte, désormais
  // dans lib/mailbox-quota.ts. Ici l’utilisateur a explicitement demandé à
  // ajouter une boîte : un refus doit se voir.
  if (!(await boiteAutorisee(supabaseAdmin, uid, userInfo.email))) {
    return redirectWithStatus(req.url, 'error', 'limite de boîtes mail atteinte pour ce forfait')
  }

  const { error: upsertError } = await supabaseAdmin.from('mailboxes').upsert({
    user_id: uid,
    provider,
    email: userInfo.email,
    label: provider === 'outlook' ? 'Outlook' : 'Gmail',
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
