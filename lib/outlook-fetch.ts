// lib/outlook-fetch.ts
// Récupération des messages d'une boîte Outlook, normalisés dans EXACTEMENT
// la même forme que ceux de Gmail (voir fetchOneMessage dans
// app/api/emails/route.ts). Tout ce qui vient après — analyse IA, détection
// de rendez-vous, création de tâches, calcul du temps économisé — ne doit
// jamais avoir à savoir d'où vient un email.
//
// ⚠️ NON VÉRIFIÉ CONTRE L'API RÉELLE : écrit d'après la documentation
// Microsoft Graph, sans boîte Outlook connectée. Voir lib/outlook-mailbox.ts.
import { decryptToken, encryptToken } from '@/lib/token-crypto'
import { GRAPH, refreshOutlookToken } from '@/lib/outlook-mailbox'

/**
 * Même fenêtre que Gmail (INITIAL_SYNC_MAX_AGE_DAYS) et même plafond
 * (MAX_INITIAL_SYNC_EMAILS) : les deux fournisseurs doivent remonter le même
 * volume, sinon le compteur « temps économisé » et la boîte de réception
 * n'auraient pas le même sens selon le fournisseur.
 */
const FENETRE_JOURS = 7
const PLAFOND_EMAILS = 300
const TAILLE_PAGE = 50

/**
 * Pas de synchronisation incrémentale pour l'instant — et c'est délibéré.
 *
 * Graph propose des requêtes delta, qui rendent un `deltaLink` à conserver
 * d'une synchro à l'autre. Le stocker demanderait une colonne dédiée : la
 * colonne `history_id` qui sert à Gmail contient un entier court, et y
 * glisser une URL de plusieurs centaines de caractères est un pari sur un
 * schéma que ce dépôt ne décrit pas (la table `mailboxes` a été créée
 * directement dans Supabase).
 *
 * Une fenêtre de 7 jours filtrée côté serveur Graph coûte un appel de liste
 * par synchro — acceptable, et sans risque. À reprendre quand une vraie
 * boîte sera connectée et le schéma connu.
 */

interface JetonOutlook {
  token: string
  refreshToken: string | null
  mailboxId: string
  refreshEchoue: boolean
}

async function graphFetch(supabase: any, etat: JetonOutlook, url: string): Promise<any> {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${etat.token}` } })

  if (res.status === 401 && etat.refreshToken && !etat.refreshEchoue) {
    const renouvele = await refreshOutlookToken(etat.refreshToken)
    if (renouvele) {
      etat.token = renouvele.accessToken
      if (renouvele.refreshToken) etat.refreshToken = renouvele.refreshToken
      await supabase
        .from('mailboxes')
        .update({
          access_token: encryptToken(renouvele.accessToken),
          ...(renouvele.refreshToken ? { refresh_token: encryptToken(renouvele.refreshToken) } : {}),
        })
        .eq('id', etat.mailboxId)
      res = await fetch(url, { headers: { Authorization: `Bearer ${etat.token}` } })
    } else {
      // Un seul essai : sans ce drapeau, chaque message d'une page de 50
      // relancerait son propre rafraîchissement sur un refresh token déjà
      // refusé — 50 appels pour 50 échecs.
      etat.refreshEchoue = true
    }
  }

  return res.json().catch(() => ({}))
}

/** Retire les balises d'un corps HTML. Même traitement que côté Gmail. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function nettoie(texte: string): string {
  return texte.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Un message Graph vers la forme interne.
 *
 * Correspondances qui comptent :
 *  · `internetMessageId` ↔ en-tête Message-ID RFC822 côté Gmail — c'est lui
 *    qui permet de dédupliquer un même envoi reçu sur deux boîtes connectées,
 *    y compris une Gmail et une Outlook.
 *  · `conversationId` ↔ threadId.
 *  · `isRead` est déjà un booléen, là où Gmail passe par l'étiquette UNREAD.
 *  · `labelIds` est propre à Gmail. On pose l'équivalent minimal dont dépend
 *    le reste du code : 'INBOX' tant que le message est dans la boîte de
 *    réception, 'UNREAD' s'il n'est pas lu. Sans ça, l'archivage automatique
 *    et les filtres de la boîte de réception ne verraient rien.
 */
function versEmailInterne(msg: any, mailboxId: string) {
  const expediteur = msg.from?.emailAddress || msg.sender?.emailAddress || {}
  const adresse = expediteur.address || ''
  const nom = expediteur.name || adresse

  const estHtml = msg.body?.contentType === 'html'
  const brut = msg.body?.content || ''
  const bodyHtml = estHtml ? brut : null
  const bodyText = nettoie(estHtml ? stripHtml(brut) : brut)

  const dansBoite = msg.parentFolderId ? undefined : undefined // voir estDansInbox ci-dessous
  void dansBoite

  const etiquettes: string[] = []
  if (msg.__dansInbox !== false) etiquettes.push('INBOX')
  if (msg.isRead === false) etiquettes.push('UNREAD')

  const recu = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date()

  return {
    id: msg.id,
    threadId: msg.conversationId || msg.id,
    mailboxId,
    messageIdHeader: msg.internetMessageId || null,
    subject: msg.subject || '(Sans objet)',
    sender: nom,
    senderEmail: adresse,
    preview: (msg.bodyPreview || bodyText).slice(0, 120).replace(/\n/g, ' ').trim(),
    body: bodyText,
    bodyHtml,
    receivedAt: isNaN(recu.getTime()) ? new Date().toISOString() : recu.toISOString(),
    isRead: msg.isRead !== false,
    priority: 'normal' as const,
    tags: [] as string[],
    hasAIReply: false,
    analysisStatus: 'pending' as const,
    labelIds: etiquettes,
    // Les pièces jointes ne sont pas listées ici : Graph demande un appel
    // séparé par message (/messages/{id}/attachments), soit 300 appels de
    // plus à chaque synchro complète. `hasAttachments` suffit à savoir qu'il
    // y en a ; la liste se chargera à l'ouverture du message.
    attachments: [] as { filename: string; mimeType: string; size: number; attachmentId: string }[],
    hasAttachments: msg.hasAttachments === true,
  }
}

/**
 * Tous les messages de la boîte de réception reçus dans la fenêtre.
 *
 * Le filtre est posé côté Graph (`$filter` sur receivedDateTime) et non après
 * coup : aucun message hors fenêtre n'est téléchargé. `$select` limite les
 * champs renvoyés — sans lui, Graph rend l'intégralité de chaque message,
 * pièces jointes incluses en base64 pour certaines, ce qui multiplie le poids
 * de la réponse.
 */
export async function fetchOutlookMailboxEmails(
  supabase: any,
  mailbox: { id: string; access_token: string | null; refresh_token: string | null }
): Promise<any[]> {
  if (!mailbox.access_token) return []

  const etat: JetonOutlook = {
    token: decryptToken(mailbox.access_token)!,
    refreshToken: decryptToken(mailbox.refresh_token),
    mailboxId: mailbox.id,
    refreshEchoue: false,
  }

  const depuis = new Date(Date.now() - FENETRE_JOURS * 24 * 60 * 60 * 1000).toISOString()
  const champs = [
    'id', 'conversationId', 'internetMessageId', 'subject', 'from', 'sender',
    'bodyPreview', 'body', 'receivedDateTime', 'isRead', 'hasAttachments',
  ].join(',')

  let url =
    `${GRAPH}/me/mailFolders/inbox/messages` +
    `?$filter=${encodeURIComponent(`receivedDateTime ge ${depuis}`)}` +
    `&$select=${champs}` +
    `&$orderby=${encodeURIComponent('receivedDateTime desc')}` +
    `&$top=${TAILLE_PAGE}`

  const messages: any[] = []
  // Plafond de pages indépendant du contenu : si Graph rendait des pages
  // vides tout en fournissant un @odata.nextLink, la seule condition sur le
  // nombre de messages ne suffirait pas à sortir.
  let pages = 0
  const MAX_PAGES = 20

  while (url && messages.length < PLAFOND_EMAILS && pages < MAX_PAGES) {
    const data = await graphFetch(supabase, etat, url)
    if (data.error) {
      console.error('Graph messages.list :', data.error.code, data.error.message)
      break
    }
    for (const m of data.value || []) {
      // On lit le dossier Boîte de réception : tout ce qui en vient y est.
      m.__dansInbox = true
      messages.push(versEmailInterne(m, mailbox.id))
      if (messages.length >= PLAFOND_EMAILS) break
    }
    url = data['@odata.nextLink'] || ''
    pages++
  }

  if (pages >= MAX_PAGES) {
    console.error(`⚠️ Boîte Outlook ${mailbox.id} : plafond de ${MAX_PAGES} pages atteint.`)
  }

  return messages
}
