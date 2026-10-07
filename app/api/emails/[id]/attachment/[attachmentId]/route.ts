// app/api/emails/[id]/attachment/[attachmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tryAcrossMailboxes } from '@/lib/gmail-mailbox'

export async function GET(
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

  if (!result) {
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 })
  }
  if (result.data.error) {
    return NextResponse.json({ error: result.data.error.message }, { status: 400 })
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