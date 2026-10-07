// lib/gmail-mailbox.ts
// Support multi-boîte Gmail : lit toutes les boîtes connectées d'un utilisateur
// (pas juste la première) et essaie une requête sur chacune jusqu'à ce qu'une
// réponde — une ressource Gmail (message, pièce jointe) n'existe que dans UNE
// boîte ; un 404 signifie "mauvaise boîte", pas une vraie erreur.
import { SupabaseClient } from '@supabase/supabase-js'
import { encryptToken, decryptToken } from '@/lib/token-crypto'

interface MailboxRow {
  id: string
  access_token: string | null
  refresh_token: string | null
  history_id: string | null
}

async function refreshGmailToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    })
    const data = await res.json()
    return data.access_token || null
  } catch (err) {
    console.error('Erreur refresh token:', err)
    return null
  }
}

export async function getGmailMailboxes(supabase: SupabaseClient, userId: string): Promise<MailboxRow[]> {
  const { data } = await supabase
    .from('mailboxes')
    .select('id, access_token, refresh_token, history_id')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .eq('is_connected', true)
  return data || []
}

export async function tryAcrossMailboxes(
  supabase: SupabaseClient,
  userId: string,
  request: (token: string) => Promise<Response>
): Promise<{ res: Response; data: any; mailboxId: string } | null> {
  const mailboxes = await getGmailMailboxes(supabase, userId)
  let last: { res: Response; data: any; mailboxId: string } | null = null

  for (const mailbox of mailboxes) {
    if (!mailbox.access_token) continue
    let token = decryptToken(mailbox.access_token)!
    let res = await request(token)
    let data = await res.json().catch(() => ({}))

    if (res.status === 401 && mailbox.refresh_token) {
      const refreshTokenPlain = decryptToken(mailbox.refresh_token)
      const newToken = refreshTokenPlain ? await refreshGmailToken(refreshTokenPlain) : null
      if (newToken) {
        await supabase.from('mailboxes').update({ access_token: encryptToken(newToken) }).eq('id', mailbox.id)
        token = newToken
        res = await request(token)
        data = await res.json().catch(() => ({}))
      }
    }

    // 404 = mauvaise boîte pour cette ressource ; 401 persistant (refresh
    // absent ou échoué) = boîte injoignable, impossible de savoir si elle
    // possédait la ressource. Dans les deux cas on essaie la boîte suivante
    // au lieu d'abandonner sur le premier échec — sinon une boîte à jeton
    // mort bloque l'accès aux ressources des autres boîtes, valides.
    if (res.status === 404 || res.status === 401) {
      last = { res, data, mailboxId: mailbox.id }
      continue
    }
    return { res, data, mailboxId: mailbox.id }
  }

  return last
}
