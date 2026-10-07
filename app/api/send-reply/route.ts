// app/api/send-reply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 })
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