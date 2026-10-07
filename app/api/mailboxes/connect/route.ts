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

export async function GET(req: NextRequest) {
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

  const mailboxLimit = getPlan(profile?.plan).limits.mailboxes
  if (mailboxLimit !== null && (count ?? 0) >= mailboxLimit) {
    return NextResponse.json({ error: 'Limite de boîtes mail atteinte pour ce forfait' }, { status: 403 })
  }

  // State signé (AES-256-GCM, même clé que les tokens) : porte l'utilisateur
  // jusqu'au callback sans dépendre d'une session/cookie, et ne peut pas être
  // forgé pour rattacher une boîte au compte de quelqu'un d'autre.
  const state = encryptToken(JSON.stringify({ uid: user.id, exp: Date.now() + 10 * 60 * 1000 }))

  const redirectUri = `${req.nextUrl.origin}/api/mailboxes/callback`
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
