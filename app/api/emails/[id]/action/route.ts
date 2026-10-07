// app/api/emails/[id]/action/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const result = await tryAcrossMailboxes(supabase, user.id, (token) =>
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

  if (!result) {
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 })
  }
  if (result.data.error) {
    return NextResponse.json({ error: result.data.error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, labelIds: result.data.labelIds })
}