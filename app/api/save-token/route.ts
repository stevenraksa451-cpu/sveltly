// app/api/save-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptToken } from '@/lib/token-crypto'

export async function POST(req: NextRequest) {
  const { accessToken, providerToken, refreshToken } = await req.json()
  if (!accessToken || !providerToken) {
    return NextResponse.json({ error: 'accessToken ou providerToken manquant' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Clé refresh_token OMISE (pas mise à null) quand refreshToken est absent —
  // Google ne le renvoie que lors du tout premier consentement ; toute
  // reconnexion ultérieure de ce même compte Gmail passe par ici sans
  // refresh_token. Un upsert qui l'écrirait explicitement à null effacerait
  // alors un refresh_token valide déjà stocké, cassant silencieusement la
  // synchro en arrière-plan dès l'expiration de l'access_token (~1h) — même
  // bug déjà identifié et corrigé dans app/auth/callback/route.ts (l'autre
  // chemin possible selon que Supabase renvoie un "code" ou un fragment
  // #access_token), avec le même correctif : omettre la clé plutôt que la
  // mettre à null, pour que l'upsert laisse la valeur existante intacte sur
  // la ligne déjà en base (PostgREST ne touche que les colonnes présentes
  // dans le payload lors d'un upsert en conflit).
  const { error } = await supabase.from('mailboxes').upsert({
    user_id: user.id,
    provider: 'gmail',
    email: user.email,
    label: 'Gmail',
    access_token: encryptToken(providerToken),
    ...(refreshToken ? { refresh_token: encryptToken(refreshToken) } : {}),
    is_connected: true,
  }, { onConflict: 'user_id,email' })

  if (error) {
    console.error('Erreur upsert mailbox (save-token):', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}