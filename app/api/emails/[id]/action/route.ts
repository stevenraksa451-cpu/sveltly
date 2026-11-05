// app/api/emails/[id]/action/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'
import { tryAcrossOutlookMailboxes, GRAPH } from '@/lib/outlook-mailbox'
import { routeJson } from '@/lib/api-handler'

async function POSTInterne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { action } = await req.json()

  let body: { addLabelIds?: string[]; removeLabelIds?: string[] } = {}

  if (action === 'archive') body = { removeLabelIds: ['INBOX'] }
  else if (action === 'unarchive') body = { addLabelIds: ['INBOX'] }
  else if (action === 'markUnread') body = { addLabelIds: ['UNREAD'] }
  else if (action === 'markRead') body = { removeLabelIds: ['UNREAD'] }
  else return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  let result = await tryAcrossMailboxes(supabase, user.id, (token) =>
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

  // Aucune boîte Gmail, ou aucune ne connaît ce message (404) : l'identifiant
  // vient alors d'une boîte Outlook. Pas besoin que le client dise de quel
  // fournisseur il parle — un identifiant de message n'existe que dans UNE
  // boîte, et le 404 le dit déjà.
  if (!result || result.res.status === 404) {
    const outlook = await actionOutlook(supabase, user.id, id, action)
    if (outlook) return outlook
  }

  if (!result) {
    return NextResponse.json({ error: 'Aucune boîte mail connectée' }, { status: 400 })
  }
  if (result.data.error) {
    return NextResponse.json({ error: result.data.error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, labelIds: result.data.labelIds })
}

/**
 * Même action, côté Microsoft Graph.
 *
 * Graph n'a pas d'étiquettes : archiver DÉPLACE le message vers le dossier
 * Archive, et lu/non lu est un champ `isRead` modifié par PATCH. Les deux
 * verbes HTTP diffèrent donc, là où Gmail passe tout par un seul /modify.
 *
 * Le déplacement rend un message au NOUVEL identifiant — il est renvoyé au
 * client, qui doit l'utiliser pour toute action ultérieure sur ce message.
 */
async function actionOutlook(
  supabase: any,
  userId: string,
  id: string,
  action: string
): Promise<NextResponse | null> {
  if (action === 'archive' || action === 'unarchive') {
    const destination = action === 'archive' ? 'archive' : 'inbox'
    const res = await tryAcrossOutlookMailboxes(supabase, userId, (token) =>
      fetch(`${GRAPH}/me/messages/${id}/move`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId: destination }),
      })
    )
    if (!res || res.res.status === 404) return null
    if (res.data?.error) {
      return NextResponse.json({ error: res.data.error.message }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      labelIds: action === 'archive' ? [] : ['INBOX'],
      // Le client doit remplacer l'identifiant qu'il détenait.
      id: res.data?.id ?? id,
    })
  }

  const lu = action === 'markRead'
  const res = await tryAcrossOutlookMailboxes(supabase, userId, (token) =>
    fetch(`${GRAPH}/me/messages/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: lu }),
    })
  )
  if (!res || res.res.status === 404) return null
  if (res.data?.error) {
    return NextResponse.json({ error: res.data.error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, labelIds: lu ? ['INBOX'] : ['INBOX', 'UNREAD'] })
}

// Emballé par routeJson : un throw inattendu rend du JSON, jamais une
// réponse vide que res.json() ferait exploser côté client.
// Voir lib/api-handler.ts.
export const POST = routeJson(POSTInterne)
