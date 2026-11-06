// app/api/emails/[id]/attachment/[attachmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'
import { tryAcrossOutlookMailboxes, GRAPH } from '@/lib/outlook-mailbox'
import { routeJson } from '@/lib/api-handler'

async function GETInterne(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params
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

  const result = await tryAcrossMailboxes(supabase, user.id, (token) =>
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  )

  // Aucune boîte Gmail, ou aucune ne connaît ce message : l'identifiant vient
  // d'une boîte Outlook. Un identifiant de message n'existe que dans UNE
  // boîte, donc le 404 suffit à trancher — le client n'a rien à dire du
  // fournisseur.
  if (!result || result.res.status === 404) {
    const outlook = await tryAcrossOutlookMailboxes(supabase, user.id, (token) =>
      fetch(`${GRAPH}/me/messages/${id}/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
    if (outlook && outlook.res.ok && outlook.data?.contentBytes) {
      return new NextResponse(Buffer.from(outlook.data.contentBytes, 'base64'), {
        headers: {
          // Graph donne le vrai type MIME, contrairement à Gmail qui ne rend
          // que les octets — autant le transmettre.
          'Content-Type': outlook.data.contentType || 'application/octet-stream',
          'Content-Disposition': 'attachment',
        },
      })
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'Aucune boîte mail connectée' }, { status: 400 })
  }
  // Message GÉNÉRIQUE, jamais celui de Google. `result.data.error.message`
  // vient de l'API Gmail et peut porter l'identifiant interne du message, un
  // libellé de périmètre OAuth ou un fragment de requête — le renvoyer au
  // navigateur contredit la règle portée par lib/api-handler.ts, qui tient
  // justement parce qu'elle ne souffre pas d'exception. Le détail va au
  // journal, où il sert au diagnostic sans être exposé.
  if (result.data.error) {
    console.error('❌ GET /api/emails/[id]/attachment :', result.data.error.message)
    return NextResponse.json({ error: 'Pièce jointe indisponible.' }, { status: 400 })
  }

  const buffer = Buffer.from(
    result.data.data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment`,
    },
  })
}

// Emballé par routeJson : un throw inattendu rend du JSON, jamais une
// réponse vide que res.json() ferait exploser côté client.
// Voir lib/api-handler.ts.
export const GET = routeJson(GETInterne)
