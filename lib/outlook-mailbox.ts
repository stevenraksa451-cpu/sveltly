// lib/outlook-mailbox.ts
// Accès aux boîtes Outlook / Microsoft 365 via Microsoft Graph.
//
// Calqué sur lib/gmail-mailbox.ts, volontairement : même forme de fonctions,
// mêmes règles de reprise sur 401, même stratégie multi-boîte. Les deux
// fichiers restent séparés plutôt que fusionnés derrière une abstraction —
// les deux API ne se ressemblent que de loin (jetons, pagination, formes de
// message), et une couche commune aurait surtout servi à cacher les endroits
// où elles divergent.
//
// ⚠️ NON VÉRIFIÉ CONTRE L'API RÉELLE. Ce code est écrit d'après la
// documentation Microsoft Graph, mais aucune boîte Outlook n'a encore été
// connectée : il faut une application Azure (voir CLAUDE.md). Tant que ce
// n'est pas fait, `outlook` reste `planned` dans lib/providers.ts et rien de
// tout ceci n'est proposé à l'utilisateur.
import { SupabaseClient } from '@supabase/supabase-js'
import { encryptToken, decryptToken } from '@/lib/token-crypto'

/** Point de terminaison commun à tous les locataires, personnels inclus. */
export const MS_AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0'
export const GRAPH = 'https://graph.microsoft.com/v1.0'

/**
 * Permissions demandées.
 *
 * `offline_access` est ce qui déclenche l'émission d'un refresh token : sans
 * lui, Microsoft ne renvoie qu'un jeton d'accès d'une heure et la boîte se
 * déconnecte toute seule au bout d'une heure. C'est l'équivalent exact du
 * `access_type: 'offline'` côté Google.
 *
 * `Mail.ReadWrite` et non `Mail.Read` : l'archivage automatique déplace un
 * message vers le dossier Archive, ce qui est une écriture.
 */
export const MS_SCOPES = [
  'offline_access',
  'openid',
  'email',
  'profile',
  'User.Read',
  'Mail.ReadWrite',
  'Mail.Send',
]

export interface OutlookMailboxRow {
  id: string
  access_token: string | null
  refresh_token: string | null
}

export function microsoftCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

/**
 * Rafraîchit un jeton d'accès Microsoft.
 *
 * Renvoie AUSSI le nouveau refresh token : contrairement à Google, qui
 * réutilise le même indéfiniment, Microsoft peut en émettre un nouveau à
 * chaque rafraîchissement et invalider l'ancien (rotation). Ne pas
 * réenregistrer celui qui revient condamne la boîte au premier roulement —
 * elle se déconnecterait silencieusement quelques jours plus tard.
 */
export async function refreshOutlookToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string | null } | null> {
  const creds = microsoftCredentials()
  if (!creds) {
    console.error('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET absents')
    return null
  }
  try {
    const res = await fetch(`${MS_AUTHORITY}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: MS_SCOPES.join(' '),
      }),
    })
    const data = await res.json()
    if (!data.access_token) {
      console.error('Refresh Microsoft refusé :', data.error_description || data.error)
      return null
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token || null }
  } catch (err) {
    console.error('Erreur refresh token Microsoft :', err)
    return null
  }
}

export async function getOutlookMailboxes(
  supabase: SupabaseClient,
  userId: string
): Promise<OutlookMailboxRow[]> {
  const { data } = await supabase
    .from('mailboxes')
    .select('id, access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'outlook')
    .eq('is_connected', true)
  return data || []
}

/**
 * Essaie une requête Graph sur chaque boîte Outlook jusqu'à ce qu'une
 * réponde. Une ressource (message, pièce jointe) n'existe que dans UNE boîte :
 * un 404 veut dire « mauvaise boîte », pas « erreur ».
 *
 * Même contrat de retour que tryAcrossMailboxes côté Gmail, pour que les
 * routes appelantes se comportent pareil quel que soit le fournisseur.
 */
export async function tryAcrossOutlookMailboxes(
  supabase: SupabaseClient,
  userId: string,
  request: (token: string) => Promise<Response>
): Promise<{ res: Response; data: any; mailboxId: string } | null> {
  const mailboxes = await getOutlookMailboxes(supabase, userId)
  let dernier: { res: Response; data: any; mailboxId: string } | null = null

  for (const mailbox of mailboxes) {
    if (!mailbox.access_token) continue
    let token = decryptToken(mailbox.access_token)!
    let res = await request(token)
    let data = await res.json().catch(() => ({}))

    if (res.status === 401 && mailbox.refresh_token) {
      const refreshPlain = decryptToken(mailbox.refresh_token)
      const renouvele = refreshPlain ? await refreshOutlookToken(refreshPlain) : null
      if (renouvele) {
        await supabase
          .from('mailboxes')
          .update({
            access_token: encryptToken(renouvele.accessToken),
            // Voir refreshOutlookToken : Microsoft fait tourner les refresh
            // tokens, ne pas enregistrer le nouveau tue la boîte à terme.
            ...(renouvele.refreshToken ? { refresh_token: encryptToken(renouvele.refreshToken) } : {}),
          })
          .eq('id', mailbox.id)
        token = renouvele.accessToken
        res = await request(token)
        data = await res.json().catch(() => ({}))
      }
    }

    if (res.status === 404 || res.status === 401) {
      dernier = { res, data, mailboxId: mailbox.id }
      continue
    }
    return { res, data, mailboxId: mailbox.id }
  }

  return dernier
}
