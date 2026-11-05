// app/api/mailboxes/connect/route.ts
// Démarre la connexion d'une boîte Gmail SUPPLÉMENTAIRE, sans passer par
// supabase.auth.signInWithOAuth — celui-ci ré-authentifie la session Sveltly
// elle-même plutôt que d'ajouter une boîte, ce qui écrasait la boîte
// existante dès qu'un compte Google différent était choisi. Ce flux OAuth
// est indépendant de la session Supabase : le state signé porte l'identité
// de l'utilisateur jusqu'au callback.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptToken } from '@/lib/token-crypto'
import { getPlan } from '@/lib/plans'
import { MS_AUTHORITY, MS_SCOPES, microsoftCredentials } from '@/lib/outlook-mailbox'
import { PROVIDERS } from '@/lib/providers'
import { routeJson } from '@/lib/api-handler'

async function GETInterne(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const { count } = await supabase
    .from('mailboxes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Une boîte dont le jeton est mort doit TOUJOURS pouvoir être réautorisée,
  // même au plafond du forfait : réparer une connexion existante n'est pas
  // « ajouter une boîte ». Sans cette exception, un utilisateur du forfait
  // Gratuit (1 boîte) dont le jeton Gmail expirait se retrouvait enfermé —
  // la seule action proposée étant « Passer à Pro », qui n'aurait rien
  // réparé. Le vrai verrou est dans le callback, qui connaît l'adresse
  // choisie et n'applique la limite qu'à une adresse NOUVELLE.
  const { count: brokenCount } = await supabase
    .from('mailboxes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_connected', false)

  const mailboxLimit = getPlan(profile?.plan).limits.mailboxes
  const atLimit = mailboxLimit !== null && (count ?? 0) >= mailboxLimit
  if (atLimit && (brokenCount ?? 0) === 0) {
    return NextResponse.json({ error: 'Limite de boîtes mail atteinte pour ce forfait' }, { status: 403 })
  }

  // Quel fournisseur ? Le défaut reste Gmail : tous les appels existants,
  // qui ne passent aucun paramètre, continuent de fonctionner tels quels.
  const demande = req.nextUrl.searchParams.get('provider') === 'outlook' ? 'outlook' : 'gmail'

  // Un fournisseur encore `planned` dans lib/providers.ts ne doit pas être
  // joignable, même en appelant l'URL à la main : la source unique décide,
  // ici comme sur la vitrine.
  const connu = PROVIDERS.find(p => p.id === demande)
  if (!connu || connu.status !== 'live') {
    return NextResponse.json({ error: `${connu?.name ?? demande} n’est pas encore disponible` }, { status: 400 })
  }

  // State signé (AES-256-GCM, même clé que les tokens) : porte l'utilisateur
  // jusqu'au callback sans dépendre d'une session/cookie, et ne peut pas être
  // forgé pour rattacher une boîte au compte de quelqu'un d'autre. Il porte
  // aussi le fournisseur — le callback est partagé, et c'est le seul moyen
  // fiable de savoir à qui échanger le code (un paramètre d'URL en clair
  // serait modifiable par l'utilisateur).
  const state = encryptToken(JSON.stringify({
    uid: user.id,
    provider: demande,
    exp: Date.now() + 10 * 60 * 1000,
  }))

  const redirectUri = `${req.nextUrl.origin}/api/mailboxes/callback`

  if (demande === 'outlook') {
    const creds = microsoftCredentials()
    if (!creds) {
      console.error('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET absents')
      return NextResponse.json({ error: 'Connexion Outlook non configurée' }, { status: 503 })
    }
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      // select_account, et non consent : redemander le consentement à chaque
      // fois réaffiche l'écran de permissions même pour une simple
      // reconnexion. Le choix du compte, lui, reste nécessaire — sans quoi
      // Microsoft réutilise silencieusement la session en cours et il
      // devient impossible d'ajouter une seconde boîte.
      prompt: 'select_account',
      scope: MS_SCOPES.join(' '),
      state,
    })
    return NextResponse.json({ url: `${MS_AUTHORITY}/authorize?${params.toString()}` })
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    state,
  })

  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
}

// Emballé par routeJson : un throw inattendu rend du JSON, jamais une
// réponse vide que res.json() ferait exploser côté client.
// Voir lib/api-handler.ts.
export const GET = routeJson(GETInterne)
