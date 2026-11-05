// app/api/send-reply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'
import { getGmailMailboxes } from '@/lib/gmail-mailbox'
import { tryAcrossOutlookMailboxes, getOutlookMailboxes, GRAPH } from '@/lib/outlook-mailbox'
import { routeJson } from '@/lib/api-handler'

async function POSTInterne(req: NextRequest) {
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

  const { to, subject, body, threadId } = await req.json()
  if (!to || !body) return NextResponse.json({ error: 'Destinataire ou corps manquant' }, { status: 400 })

  // Retire tout retour à la ligne de To/Subject avant de les coller dans les
  // en-têtes bruts du message — sans ça, une valeur contenant \n/\r pourrait
  // injecter des en-têtes supplémentaires (ex: "Bcc: ..."), un CRLF header
  // injection classique. `to` et `subject` ne devraient de toute façon
  // jamais légitimement contenir de retour à la ligne.
  const sanitizeHeader = (value: string) => String(value).replace(/[\r\n]+/g, ' ').trim()
  const safeTo = sanitizeHeader(to)
  const safeSubject = sanitizeHeader(subject || '')

  const emailContent = [
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body
  ].join('\n')

  const encoded = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // De quelle boîte part la réponse ?
  //
  // Un envoi n'a pas d'identifiant de message à sonder, contrairement aux
  // actions : impossible de deviner le fournisseur par un 404. On regarde
  // donc ce que l'utilisateur a connecté. Avec les DEUX, Gmail l'emporte —
  // c'est le comportement historique, et répondre depuis la mauvaise adresse
  // est un défaut connu du mode multi-boîte, pas une régression introduite
  // par Outlook. Le corriger demande que le client transmette la boîte
  // d'origine du message : noté dans CLAUDE.md.
  const boitesGmail = await getGmailMailboxes(supabase, user.id)

  if (boitesGmail.length === 0) {
    const boitesOutlook = await getOutlookMailboxes(supabase, user.id)
    if (boitesOutlook.length === 0) {
      return NextResponse.json({ error: 'Aucune boîte mail connectée' }, { status: 400 })
    }

    // Graph prend un objet, pas un message RFC822 encodé : ni en-têtes bruts
    // à assembler, ni injection d'en-tête possible — les champs sont séparés
    // par construction.
    const envoi = await tryAcrossOutlookMailboxes(supabase, user.id, (token) =>
      fetch(`${GRAPH}/me/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: safeSubject,
            body: { contentType: 'Text', content: body },
            toRecipients: [{ emailAddress: { address: safeTo } }],
          },
          saveToSentItems: true,
        }),
      })
    )

    // sendMail rend 202 Accepted avec un corps VIDE : `data` est alors {} et
    // il ne faut surtout pas le lire comme une erreur.
    if (!envoi) {
      return NextResponse.json({ error: 'Aucune boîte mail connectée' }, { status: 400 })
    }
    if (!envoi.res.ok) {
      const message = envoi.data?.error?.message || `envoi refusé (${envoi.res.status})`
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await supabase.from('reply_history').insert({ user_id: user.id, body, was_ai: true })
    return NextResponse.json({ ok: true })
  }

  const result = await tryAcrossMailboxes(supabase, user.id, (token) =>
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw: encoded,
        ...(threadId ? { threadId } : {}),
      })
    })
  )

  console.log('Gmail send response:', result?.data?.error || 'OK')

  if (!result) {
    return NextResponse.json({ error: 'Aucune boîte mail connectée' }, { status: 400 })
  }
  if (result.data.error) {
    return NextResponse.json({ error: result.data.error.message }, { status: 400 })
  }

  await supabase.from('reply_history').insert({
    user_id: user.id,
    body: body,
    was_ai: true,
  })

  return NextResponse.json({ ok: true })
}

// Emballé par routeJson : un throw inattendu rend du JSON, jamais une
// réponse vide que res.json() ferait exploser côté client.
// Voir lib/api-handler.ts.
export const POST = routeJson(POSTInterne)
