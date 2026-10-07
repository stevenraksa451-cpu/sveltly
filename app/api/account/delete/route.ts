// app/api/account/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supprime définitivement le compte de l'appelant authentifié — jamais un id
// fourni par le client, toujours celui résolu depuis son propre token.
// supabase.auth.admin.deleteUser() nécessite la clé service-role (jamais
// exposée au navigateur), d'où cette route serveur dédiée — voir le TODO
// qu'elle remplace dans app/(app)/settings/page.tsx (handleDeleteAccount).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Client "appelant" (clé anon + token utilisateur) : sert uniquement à
  // vérifier QUI fait la demande, jamais à effectuer la suppression elle-même.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Client admin (clé service-role) : seul habilité à supprimer un
  // utilisateur Auth — jamais instancié avec un autre id que celui vérifié
  // ci-dessus.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Best-effort : la photo de profil vit dans Storage, pas dans une table
  // Postgres — elle n'est donc couverte par aucun "on delete cascade" des
  // clés étrangères vers auth.users (voir supabase-schema.sql). Un échec ici
  // ne doit jamais empêcher la suppression du compte lui-même.
  try {
    const { data: files } = await supabaseAdmin.storage.from('avatars').list(user.id)
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`))
    }
  } catch (err) {
    console.error('Erreur suppression avatar (non bloquant):', err)
  }

  // Supprime la ligne auth.users — toutes les tables applicatives (profiles,
  // mailboxes, emails, calendar_events, tasks, reply_history, contacts,
  // calendar_accounts) sont déclarées "on delete cascade" vers profiles.id ou
  // auth.users.id (voir supabase-schema.sql) : cette seule suppression
  // entraîne le nettoyage complet, sans requête manuelle table par table.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('❌ Erreur suppression compte:', error.message)
    return NextResponse.json({ error: 'La suppression a échoué, réessayez.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
