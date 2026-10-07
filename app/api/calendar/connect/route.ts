// app/api/calendar/connect/route.ts
// Démarre la connexion d'un calendrier Google — même schéma que
// /api/mailboxes/connect (state signé, indépendant de la session Supabase),
// mais distinct : un utilisateur peut vouloir connecter Gmail sans connecter
// son agenda, ou inversement. calendar_accounts est une table séparée de
// mailboxes, pas la même ressource Google conceptuellement.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptToken } from '@/lib/token-crypto'

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

  // Fonctionnalité Pro — la connexion Google Calendar ne doit pas pouvoir être
  // déclenchée en appelant cette route directement même si le bouton est
  // masqué côté client pour les comptes Gratuit.
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'La synchronisation Google Calendar est réservée au forfait Pro.' }, { status: 403 })
  }

  const state = encryptToken(JSON.stringify({ uid: user.id, exp: Date.now() + 10 * 60 * 1000 }))

  const redirectUri = `${req.nextUrl.origin}/api/calendar/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    state,
  })

  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
}
