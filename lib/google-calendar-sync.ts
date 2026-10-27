// lib/google-calendar-sync.ts
// Écriture/suppression best-effort vers le vrai Google Calendar de l'utilisateur
// (calendar_accounts), pour toute source d'événement côté Sveltly — planification
// automatique par l'IA (app/api/emails/route.ts) et création manuelle
// (app/api/calendar/events/route.ts). Centralisé ici pour que le chiffrement des
// tokens et la logique de refresh ne soient écrits qu'une seule fois.
import { encryptToken, decryptToken } from '@/lib/token-crypto'

export interface CalendarAccountRow {
  id: string
  access_token: string
  refresh_token: string | null
}

interface EventPayload {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  // Fuseau horaire du profil (profiles.timezone) — sans lui, l'événement
  // était toujours créé avec Europe/Paris en dur, décalant l'heure affichée
  // dans Google Calendar pour tout utilisateur Pro configuré sur un autre
  // fuseau (l'heure murale startTime/endTime reste correcte, mais Google
  // l'interprète alors dans le mauvais fuseau).
  timeZone: string
}

async function refreshCalendarToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data.access_token || null
  } catch (err) {
    console.error('Erreur refresh token Google Calendar:', err)
    return null
  }
}

/**
 * Repasse `is_connected` à false quand Google refuse définitivement l'accès.
 *
 * Le côté Gmail avait déjà ce correctif (`markMailboxDisconnected` dans
 * app/api/emails/route.ts) ; le côté agenda ne l'a jamais eu, et le symptôme
 * est mot pour mot celui décrit là-bas. `is_connected` ne valait true que
 * depuis le callback OAuth et n'en redescendait jamais : un calendrier dont
 * le jeton avait expiré ou été révoqué restait affiché « Connecté » dans les
 * Réglages pendant que chaque synchro échouait en silence. L'utilisateur
 * voyait un agenda qui ne se remplit plus, sans savoir pourquoi, et sans
 * rien à cliquer.
 *
 * Le `.eq('is_connected', true)` évite de réécrire la ligne à chaque appel
 * une fois la déconnexion déjà enregistrée.
 */
export async function marquerCalendrierDeconnecte(supabase: any, accountId: string) {
  const { error } = await supabase
    .from('calendar_accounts')
    .update({ is_connected: false })
    .eq('id', accountId)
    .eq('is_connected', true)
  if (error) console.error('❌ Marquage calendrier déconnecté:', error.message)
  else console.log('🔌 Calendrier ' + accountId + ' marqué déconnecté (jeton invalide)')
}

// Rejoue `doFetch` avec un access_token rafraîchi si Google répond 401, et
// persiste le nouveau token chiffré — mêmes garanties que pour Gmail
// (le refresh_token ne quitte jamais cette fonction en clair au-delà de l'appel réseau).
//
// ⚠️ Le test portait sur `401 && account.refresh_token`. Sans refresh_token,
// la branche entière était sautée : la réponse 401 remontait telle quelle,
// l'appelant logguait son erreur, et personne n'enregistrait jamais que le
// calendrier était mort. C'est maintenant l'inverse — on entre dans la
// branche sur le seul 401, et on en ressort en ayant tranché.
async function withFreshToken(
  supabase: any,
  account: CalendarAccountRow,
  doFetch: (token: string) => Promise<Response>
): Promise<Response> {
  const token = decryptToken(account.access_token)!
  let res = await doFetch(token)

  if (res.status === 401) {
    const refreshTokenPlain = account.refresh_token ? decryptToken(account.refresh_token) : null
    const newToken = refreshTokenPlain ? await refreshCalendarToken(refreshTokenPlain) : null
    if (newToken) {
      await supabase.from('calendar_accounts').update({ access_token: encryptToken(newToken) }).eq('id', account.id)
      res = await doFetch(newToken)
    }

    // Toujours 401 après la tentative — ou aucun refresh_token à jouer, ou
    // un refresh_token que Google refuse : les jetons sont morts pour de
    // bon. Seule une reconnexion peut les ressusciter, encore faut-il que
    // quelqu'un le sache.
    if (res.status === 401) await marquerCalendrierDeconnecte(supabase, account.id)
  }

  return res
}

// Crée l'événement dans le Google Calendar principal de l'utilisateur.
// Retourne l'id de l'événement Google créé (à conserver dans
// calendar_events.google_event_id pour permettre sa suppression plus tard),
// ou null en cas d'échec — ne lève jamais, l'appelant ne doit pas bloquer
// sur un échec de synchronisation externe.
export async function createGoogleCalendarEvent(
  supabase: any,
  account: CalendarAccountRow,
  event: EventPayload
): Promise<string | null> {
  const body = {
    summary: event.title,
    description: event.description,
    start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: event.timeZone },
    end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone: event.timeZone },
  }

  const res = await withFreshToken(supabase, account, (token) =>
    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    console.error('❌ Erreur écriture Google Calendar:', errData?.error?.message || res.status)
    return null
  }

  const data = await res.json().catch(() => ({}))
  console.log('✅ Événement synchronisé vers Google Calendar')
  return data.id || null
}

// Déplace (change d'horaire) un événement déjà synchronisé vers Google
// Calendar — utilisé par le réarrangement de journée (voir
// app/api/calendar/apply-arrangement) quand un événement déplacé localement
// avait déjà un google_event_id. Best-effort comme le reste de ce fichier :
// ne lève jamais, retourne simplement false en cas d'échec pour que
// l'appelant puisse le signaler sans annuler le changement local (Supabase
// reste la source de vérité — voir le commentaire sur apply-arrangement).
export async function updateGoogleCalendarEvent(
  supabase: any,
  account: CalendarAccountRow,
  googleEventId: string,
  event: EventPayload
): Promise<boolean> {
  const body = {
    summary: event.title,
    description: event.description,
    start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: event.timeZone },
    end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone: event.timeZone },
  }

  const res = await withFreshToken(supabase, account, (token) =>
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    console.error('❌ Erreur déplacement Google Calendar:', errData?.error?.message || res.status)
    return false
  }

  console.log('✅ Événement déplacé dans Google Calendar')
  return true
}

// Supprime l'événement correspondant dans Google Calendar. 404/410 (déjà
// supprimé côté Google, par ex. par l'utilisateur directement) est traité
// comme un succès plutôt qu'une erreur.
export async function deleteGoogleCalendarEvent(
  supabase: any,
  account: CalendarAccountRow,
  googleEventId: string
): Promise<void> {
  const res = await withFreshToken(supabase, account, (token) =>
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  )

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errData = await res.json().catch(() => ({}))
    console.error('❌ Erreur suppression Google Calendar:', errData?.error?.message || res.status)
  } else {
    console.log('✅ Événement supprimé de Google Calendar')
  }
}
