// app/api/emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveScheduling, ArrangeableEvent } from '@/lib/scheduling'
import { getPlan } from '@/lib/plans'
import { encryptToken, decryptToken } from '@/lib/token-crypto'
import { getGmailMailboxes, tryAcrossMailboxes } from '@/lib/gmail-mailbox'
import { getCachedEmails, setCachedEmails, CACHE_DURATION } from '@/lib/email-cache'
import { createGoogleCalendarEvent } from '@/lib/google-calendar-sync'

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
    console.log('Token refreshed:', !!data.access_token)
    return data.access_token || null
  } catch (err) {
    console.error('Erreur refresh token:', err)
    return null
  }
}

// Porte le token d'accès courant d'UNE boîte pendant toute la durée de sa
// synchro (qui peut enchaîner plusieurs pages de messages.list/history.list
// et plusieurs dizaines d'appels messages.get) — un seul refresh profite à
// tous les appels restants, au lieu de re-tester le token avant chaque appel.
interface GmailTokenState {
  token: string
  refreshToken: string | null
  mailboxId: string
  // Devient true dès qu'un refresh a échoué (refresh_token invalide/révoqué)
  // — évite de retenter un refresh à chaque appel suivant de la même synchro,
  // qui échouerait de la même façon à chaque fois.
  refreshFailed: boolean
}

// Appelle l'API Gmail avec le token courant ; si Gmail répond 401, rafraîchit
// le token UNE fois, persiste le nouveau en base, puis rejoue EXACTEMENT le
// même appel avec le token frais — la pagination en cours (page N d'une
// boucle messages.list/history.list, ou un lot de messages.get) peut ainsi
// continuer avec le nouveau token au lieu de tout redémarrer depuis le début.
async function gmailFetchJson(supabase: any, tokenState: GmailTokenState, url: string): Promise<any> {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${tokenState.token}` } })

  if (res.status === 401 && tokenState.refreshToken && !tokenState.refreshFailed) {
    const newToken = await refreshGmailToken(tokenState.refreshToken)
    if (newToken) {
      tokenState.token = newToken
      await supabase.from('mailboxes').update({ access_token: encryptToken(newToken) }).eq('id', tokenState.mailboxId)
      res = await fetch(url, { headers: { Authorization: `Bearer ${tokenState.token}` } })
    } else {
      tokenState.refreshFailed = true
    }
  }

  return res.json()
}

// Récupère le détail de plusieurs messages par lots concurrents bornés
// (plutôt qu'un Promise.all sur la totalité) — nécessaire dès qu'un pic
// (spam massif, première synchro d'une boîte ancienne) porte le nombre de
// messages à récupérer à plusieurs centaines : un Promise.all non borné
// enverrait autant de requêtes simultanées à l'API Gmail d'un coup, avec un
// vrai risque de 429 côté Gmail lui-même et de requête HTTP interminable.
const GMAIL_FETCH_CONCURRENCY = 20

async function fetchMessagesInBatches(
  supabase: any,
  tokenState: GmailTokenState,
  ids: string[],
  mailboxId: string
): Promise<any[]> {
  const results: any[] = []
  for (let i = 0; i < ids.length; i += GMAIL_FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + GMAIL_FETCH_CONCURRENCY)
    const fetched = await Promise.all(batch.map(id => fetchOneMessage(supabase, tokenState, id, mailboxId)))
    results.push(...fetched.filter(Boolean))
  }
  return results
}

// Détail complet d'UN message Gmail, transformé au format interne de l'app.
// Partagé par le premier fetch complet et par la synchro incrémentale — même
// parsing des deux côtés, pour ne jamais faire diverger un email selon la
// façon dont il a été récupéré.
async function fetchOneMessage(supabase: any, tokenState: GmailTokenState, messageId: string, mailboxId: string) {
  const data = await gmailFetchJson(
    supabase,
    tokenState,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
  )
  if (data.error) return null

  const headers = data.payload?.headers || []
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(Sans objet)'
  const from = headers.find((h: any) => h.name === 'From')?.value || ''
  // Message-ID RFC822 : identique pour tous les destinataires d'un même
  // envoi, contrairement à l'id Gmail (propre à chaque boîte) — sert à
  // dédupliquer un email reçu en copie sur plusieurs boîtes connectées.
  const messageIdHeader = headers.find((h: any) => h.name === 'Message-ID' || h.name === 'Message-Id')?.value || null

  const senderMatch = from.match(/^(.*?)\s*<(.+?)>$/)
  const senderName = senderMatch ? senderMatch[1].trim().replace(/"/g, '') : from
  const senderEmail = senderMatch ? senderMatch[2] : from

  let { text: bodyRaw, isHtml } = extractBody(data.payload?.parts || [data.payload])
  let bodyHtml: string | null = isHtml ? bodyRaw : null

  if (!bodyRaw && data.payload?.body?.data) {
    bodyRaw = Buffer.from(data.payload.body.data, 'base64').toString('utf-8')
    if (data.payload?.mimeType === 'text/html') bodyHtml = bodyRaw
  }

  const bodyText = cleanEmailText(isHtml ? stripHtml(bodyRaw) : bodyRaw)
  const isUnread = data.labelIds?.includes('UNREAD') ?? false

  return {
    id: data.id,
    threadId: data.threadId,
    mailboxId,
    messageIdHeader,
    subject,
    sender: senderName || senderEmail,
    senderEmail,
    preview: bodyText.slice(0, 120).replace(/\n/g, ' ').trim(),
    body: bodyText,
    bodyHtml: bodyHtml,
    receivedAt: (() => {
      const timestamp = parseInt(data.internalDate)
      const date = !isNaN(timestamp) ? new Date(timestamp) : new Date()
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
    })(),
    isRead: !isUnread,
    priority: 'normal' as const,
    tags: [],
    hasAIReply: false,
    // 'pending' tant que Groq n'a pas produit une vraie analyse pour cet
    // email précis — voir la sélection de `toAnalyze` dans GET ci-dessous.
    // Volontairement distinct de la simple présence en cache : un email peut
    // être en cache (donc "connu") sans jamais être passé à 'done', par ex.
    // s'il est resté bloqué par un rate limit Groq lors d'une synchro
    // précédente — il doit alors rester éligible à l'analyse tant qu'il n'a
    // pas explicitement 'done'.
    analysisStatus: 'pending' as const,
    labelIds: data.labelIds || [],
    attachments: extractAttachments(data.payload?.parts || []),
  }
}

// Première synchro : ne remonte que les emails reçus dans cette fenêtre —
// pas "les N derniers emails quelle que soit leur ancienneté". Pour une
// boîte à volume modeste, ça réduit déjà fortement le nombre d'emails
// récupérés (donc la durée de la synchro) par rapport à un plafond purement
// numérique. Filtré directement côté Gmail via le paramètre `q` de
// messages.list (`newer_than:Nd`) plutôt que récupéré puis jeté côté
// serveur — aucun appel gaspillé sur des messages hors fenêtre.
const INITIAL_SYNC_MAX_AGE_DAYS = 7

// Filet de sécurité SUPPLÉMENTAIRE, indépendant de la fenêtre de 7 jours —
// une boîte recevant un volume anormalement élevé (spam massif, liste de
// diffusion très active) pourrait quand même accumuler beaucoup d'emails en
// seulement 7 jours. Les emails au-delà de ce plafond (même dans la fenêtre
// des 7 jours) ne sont simplement pas synchronisés par Sveltly à la première
// synchro, pas "perdus" au sens d'un bug.
//
// Mesuré en conditions réelles (boîte de test à >500 emails, voir la
// vérification de ce correctif) : récupérer le détail de 500 messages prend
// à elle seule 25 à 40s, AVANT même l'analyse Groq — au-delà d'un plafond
// autour de 300, le risque de dépasser un timeout de plateforme (la plupart
// des hébergeurs serverless coupent une route autour de 60s) devient réel.
const MAX_INITIAL_SYNC_EMAILS = 300
// Gmail plafonne lui-même messages.list à 500 résultats par page.
const GMAIL_LIST_PAGE_SIZE = 100
// Filet de sécurité indépendant de MAX_INITIAL_SYNC_EMAILS : si Gmail
// renvoyait des pages vides (0 message) tout en fournissant quand même un
// nextPageToken à chaque fois (bug rarissime), messageIds.length
// n'augmenterait jamais et la condition de sortie basée sur le nombre de
// messages ne suffirait pas à elle seule — d'où ce plafond de pages,
// indépendant du contenu des pages elles-mêmes. Largement au-dessus du
// nombre de pages réellement nécessaire (5, pour 500 emails à 100/page).
const MAX_INITIAL_SYNC_PAGES = 20

// Première synchro (ou reset) : jusqu'à MAX_INITIAL_SYNC_EMAILS emails de la
// boîte (au lieu des 20 historiques), en paginant sur messages.list tant que
// Gmail renvoie un nextPageToken — puis amorce le point de repère
// (historyId) pour que les prochains appels puissent passer en incrémental.
async function fullFetchMailbox(supabase: any, mailbox: { id: string }, tokenState: GmailTokenState): Promise<any[]> {
  const messageIds: string[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    const params = new URLSearchParams({
      maxResults: String(GMAIL_LIST_PAGE_SIZE),
      labelIds: 'INBOX',
      // Syntaxe de recherche Gmail standard (la même que dans la barre de
      // recherche Gmail) — filtre déjà appliqué côté serveur Gmail, pas de
      // récupération puis filtrage côté Sveltly.
      q: `newer_than:${INITIAL_SYNC_MAX_AGE_DAYS}d`,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const listData = await gmailFetchJson(
      supabase,
      tokenState,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
    )
    if (listData.error) {
      console.error(`Erreur messages.list (boîte ${mailbox.id}):`, listData.error.message)
      break
    }
    if (Array.isArray(listData.messages)) {
      messageIds.push(...listData.messages.map((m: { id: string }) => m.id))
    }
    pageToken = listData.nextPageToken
    pageCount++
  } while (pageToken && messageIds.length < MAX_INITIAL_SYNC_EMAILS && pageCount < MAX_INITIAL_SYNC_PAGES)

  if (pageToken && pageCount >= MAX_INITIAL_SYNC_PAGES) {
    console.error(`⚠️ messages.list boîte ${mailbox.id} : plafond de ${MAX_INITIAL_SYNC_PAGES} pages atteint (nextPageToken qui ne progresse pas, ou volume anormal) — arrêt avec ${messageIds.length} email(s) déjà listé(s).`)
  }

  const boundedIds = messageIds.slice(0, MAX_INITIAL_SYNC_EMAILS)
  if (boundedIds.length < messageIds.length) {
    console.log(`📥 Première synchro boîte ${mailbox.id} : plafond de ${MAX_INITIAL_SYNC_EMAILS} emails atteint, le reste sera ignoré (voir MAX_INITIAL_SYNC_EMAILS).`)
  }

  // Même fonction fetchOneMessage, que l'email vienne de la 1ère page ou de
  // la 5ème — aucune divergence de traitement selon la page d'origine.
  const emails = await fetchMessagesInBatches(supabase, tokenState, boundedIds, mailbox.id)

  try {
    const profileData = await gmailFetchJson(
      supabase,
      tokenState,
      'https://gmail.googleapis.com/gmail/v1/users/me/profile'
    )
    if (profileData.historyId) {
      await supabase.from('mailboxes').update({ history_id: String(profileData.historyId) }).eq('id', mailbox.id)
    }
  } catch (err) {
    // Non bloquant : sans historyId amorcé, le prochain appel refera juste
    // un fetch complet — dégradé mais jamais cassé.
    console.error('Erreur récupération historyId initial:', err)
  }

  return emails
}

// Filet de sécurité contre un nextPageToken qui ne progresserait jamais (bug
// Google réputé rarissime, jamais observé, mais qui bloquerait la requête
// indéfiniment sans cette limite). 20 pages couvrent déjà plusieurs milliers
// de messagesAdded avant d'être atteintes dans un cas réel — si ce plafond
// est atteint, on s'arrête proprement à la dernière page LUE avec succès :
// le historyId de cette page est sauvegardé, donc la synchro suivante
// reprendra exactement là où celle-ci s'est arrêtée (voir le commentaire sur
// `latestHistoryId` plus bas) plutôt que de perdre la suite de l'historique.
const MAX_HISTORY_PAGES = 20

// Synchro incrémentale via l'History API Gmail : ne récupère que ce qui a été
// ajouté depuis le dernier point de repère connu, au lieu de re-télécharger
// les derniers emails à chaque appel. Retourne null pour signaler à
// l'appelant de retomber sur fullFetchMailbox (historyId trop ancien, purgé
// par Gmail après ~7 jours d'inactivité, ou aucune base de fusion fiable).
async function syncMailboxViaHistory(
  supabase: any,
  mailbox: { id: string; history_id: string | null },
  tokenState: GmailTokenState,
  previouslyCached: any[]
): Promise<any[] | null> {
  const newMessageIds = new Set<string>()
  // historyId de la DERNIÈRE page effectivement lue — jamais celui de la
  // première réponse quand plusieurs pages existent, sinon la synchro
  // suivante relirait (et re-proposerait à l'analyse) les mêmes messages.
  let latestHistoryId: string | null = null
  let pageToken: string | undefined
  let pageCount = 0

  do {
    const params = new URLSearchParams({
      startHistoryId: mailbox.history_id!,
      historyTypes: 'messageAdded',
      labelId: 'INBOX',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const historyData = await gmailFetchJson(
      supabase,
      tokenState,
      `https://gmail.googleapis.com/gmail/v1/users/me/history?${params.toString()}`
    )

    if (historyData.error?.code === 404) {
      console.log(`🔄 historyId périmé pour la boîte ${mailbox.id} — resynchronisation complète`)
      return null
    }
    if (historyData.error) {
      console.error(`Erreur history.list (boîte ${mailbox.id}):`, historyData.error.message)
      // Erreur non fatale (ex: réseau, quota) : on garde ce qu'on avait plutôt
      // que de faire disparaître les emails déjà connus de l'utilisateur. On
      // ne touche pas au historyId enregistré — la prochaine synchro repart
      // du même point plutôt que de sauter ce qui n'a pas pu être lu ici.
      return previouslyCached
    }

    // On ne lit QUE messagesAdded (historyTypes=messageAdded le garantit déjà
    // côté Gmail, mais on reste défensif) — messageDeleted/labelAdded/
    // labelRemoved, s'ils apparaissaient malgré tout, sont ignorés sans faire
    // planter la boucle : un accès optionnel (?.) et un tableau vide par
    // défaut suffisent, aucun besoin de traitement dédié pour ces cas.
    for (const h of historyData.history || []) {
      for (const added of h.messagesAdded || []) {
        if (added?.message?.id) newMessageIds.add(added.message.id)
      }
    }

    if (historyData.historyId) latestHistoryId = String(historyData.historyId)
    pageToken = historyData.nextPageToken
    pageCount++
  } while (pageToken && pageCount < MAX_HISTORY_PAGES)

  if (pageToken && pageCount >= MAX_HISTORY_PAGES) {
    console.error(`⚠️ history.list boîte ${mailbox.id} : plafond de ${MAX_HISTORY_PAGES} pages atteint, arrêt à la dernière page lue (volume inhabituel ou nextPageToken qui ne progresse pas) — reprendra à la synchro suivante.`)
  }

  const existingIds = new Set(previouslyCached.map((e: any) => e.id))
  const idsToFetch = Array.from(newMessageIds).filter(id => !existingIds.has(id))

  // Mêmes fonctions que fullFetchMailbox (fetchMessagesInBatches →
  // fetchOneMessage) : un email détecté via l'History API suit exactement le
  // même chemin de parsing qu'un email de la première synchro.
  const newEmails = await fetchMessagesInBatches(supabase, tokenState, idsToFetch, mailbox.id)

  // Sauvegardé seulement maintenant, une fois TOUS les messages de cette
  // synchro effectivement récupérés (pas seulement listés) — pas avant, et
  // peu importe qu'ils aient déjà été analysés par Groq ou non (l'analyse
  // est une étape strictement postérieure, dans GET ci-dessous). Si l'appel
  // était interrompu avant d'arriver ici (exception réseau...), le
  // historyId précédent reste en base et rien n'est perdu.
  if (latestHistoryId) {
    await supabase.from('mailboxes').update({ history_id: latestHistoryId }).eq('id', mailbox.id)
  }

  console.log(`🔄 Synchro incrémentale boîte ${mailbox.id} : ${newEmails.length} nouvel(le)(s) email(s) sur ${pageCount} page(s), ${previouslyCached.length} déjà en cache`)

  return [...newEmails, ...previouslyCached]
}

// Récupère les emails d'UNE boîte (rafraîchit son token si besoin) — la liste
// GET boucle sur toutes les boîtes connectées et fusionne leurs résultats.
// `previouslyCached` : emails déjà connus de cette boîte (issus du cache
// applicatif), utilisés comme base de fusion pour la synchro incrémentale —
// pas comme condition de fraîcheur, leur analyse IA reste valable telle quelle.
async function fetchMailboxEmails(
  supabase: any,
  mailbox: { id: string; access_token: string | null; refresh_token: string | null; history_id: string | null },
  previouslyCached: any[]
): Promise<any[]> {
  if (!mailbox.access_token) return []

  // Plus de ping de test préalable (un maxResults=1 séparé) : le premier
  // appel réel (history.list ou messages.list ci-dessous) gère lui-même un
  // 401 via gmailFetchJson, avec refresh + reprise transparente — ça évite
  // un appel Gmail de plus à chaque synchro, y compris pour le cas le plus
  // fréquent (0 nouvel email).
  const tokenState: GmailTokenState = {
    token: decryptToken(mailbox.access_token)!,
    refreshToken: decryptToken(mailbox.refresh_token),
    mailboxId: mailbox.id,
    refreshFailed: false,
  }

  // L'incrémental exige un historyId ET une base de fusion locale fiable —
  // sans previouslyCached (cache vide : premier appel, redémarrage serveur,
  // cache invalidé après connexion d'une autre boîte...), on ne peut pas
  // distinguer "rien de nouveau" de "on a juste perdu la liste précédente",
  // donc on refait un fetch complet plutôt que de risquer de faire
  // disparaître des emails aux yeux de l'utilisateur.
  if (mailbox.history_id && previouslyCached.length > 0) {
    const incremental = await syncMailboxViaHistory(supabase, mailbox, tokenState, previouslyCached)
    if (incremental) return incremental
  }

  return fullFetchMailbox(supabase, mailbox, tokenState)
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanEmailText(text: string): string {
  return text
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\(\s*https?:\/\/[^\s)]+\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractBody(parts: any[]): { text: string; isHtml: boolean } {
  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part?.body?.data) {
      return { text: Buffer.from(part.body.data, 'base64').toString('utf-8'), isHtml: false }
    }
    // !found.isHtml est nécessaire ici, pas juste found.text : un sous-arbre
    // imbriqué (ex: multipart/alternative) peut ne contenir QUE du HTML — le
    // retourner dans cette première passe "texte brut" empêcherait de jamais
    // atteindre une partie text/plain sœur plus loin dans `parts`, puisque le
    // bloc s'arrêtait dès que found.text était non vide, HTML ou pas.
    if (part?.parts) {
      const found = extractBody(part.parts)
      if (found.text && !found.isHtml) return found
    }
  }
  for (const part of parts) {
    if (part?.mimeType === 'text/html' && part?.body?.data) {
      return { text: Buffer.from(part.body.data, 'base64').toString('utf-8'), isHtml: true }
    }
    if (part?.parts) {
      const found = extractBody(part.parts)
      if (found.text) return found
    }
  }
  return { text: '', isHtml: false }
}

function extractAttachments(parts: any[]): { filename: string; mimeType: string; size: number; attachmentId: string }[] {
  const found: any[] = []
  function walk(list: any[]) {
    for (const part of list) {
      if (part?.filename && part.filename.length > 0 && part?.body?.attachmentId) {
        found.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        })
      }
      if (part?.parts) walk(part.parts)
    }
  }
  walk(parts)
  return found
}

// Mêmes types que NO_ACTION_EMAIL_TYPES dans app/api/analyze/route.ts (pas
// importé directement : les deux routes restent volontairement autonomes,
// voir la convention déjà suivie pour parseGroqRetryAfterSeconds plus bas) —
// un email purement informatif ne doit jamais générer de tâche.
const NO_TASK_EMAIL_TYPES = new Set(['spam', 'promo', 'newsletter', 'notification', 'confirmation'])

// Toute synchro envoie ses emails à /api/analyze par lots de cette taille,
// jamais en un seul appel même pour un petit nombre d'emails — le prompt
// système seul pèse déjà une grosse partie du budget TPM (tokens par minute)
// du tier Groq gratuit (8000 TPM pour gpt-oss-120b) : un envoi "tout en un"
// de ne serait-ce que 6-8 emails suffisait à dépasser cette limite d'un coup
// (bug réel constaté : 9314 tokens demandés pour 8000 disponibles). Des lots
// de cette taille, espacés, restent sous la limite avec marge.
const GROQ_BATCH_SIZE = 3
const GROQ_BATCH_DELAY_MS = 300
// Si Groq ne précise pas de délai exploitable dans son message d'erreur pour
// une limite PAR MINUTE (qui se lève normalement bien avant) — valeur
// prudente utilisée à défaut.
const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 20
// Plafond dur sur le délai attendu avant de retenter UN lot — sans lui, un
// message Groq annonçant un délai de plusieurs dizaines de secondes (voire
// plus, mal classifié comme "par minute") ferait dépasser à lui seul tout le
// budget MAX_ANALYSIS_DURATION_MS pendant une seule itération, puisque la
// vérification du budget ne s'exécute qu'ENTRE deux lots — bug réel constaté
// en testant ce correctif (70s mesurées pour un budget cible de 30s). Passé
// ce plafond, plus rentable de laisser le lot "en attente" immédiatement que
// d'attendre dans le vide.
const MAX_SINGLE_RETRY_WAIT_MS = 15_000
// Un pic massif (spam, rattrapage après une longue absence) peut produire des
// dizaines de lots — sans garde-fou, la requête GET /api/emails elle-même
// pourrait tourner plusieurs minutes et se faire couper par un timeout de
// plateforme (la plupart des hébergeurs serverless limitent l'exécution
// d'une route à 60s ou moins) AVANT même d'avoir sauvegardé quoi que ce soit
// en cache. Passé ce budget, on arrête d'envoyer de nouveaux lots exactement
// comme pour la limite PAR JOUR (même mécanisme "pending").
//
// 30s (pas 45s) pour laisser de la marge à la récupération Gmail qui la
// précède dans la même requête (voir MAX_INITIAL_SYNC_EMAILS) : mesuré en
// conditions réelles à 25-40s à elle seule pour 500 messages. Budget total
// visé sous 60s : ~15-20s de récupération (300 emails) + 30s d'analyse.
const MAX_ANALYSIS_DURATION_MS = 30_000

interface AnalyzeBatchOutcome {
  // Résultat Groq brut par id d'email — uniquement ceux réellement analysés
  // PENDANT cet appel (jamais ceux qui reviennent du cache déjà 'done').
  analysisById: Map<string, any>
  // true si on a arrêté d'envoyer de nouveaux lots à cause d'une limite
  // Groq PAR JOUR — les emails restants gardent analysisStatus 'pending' et
  // seront proposés à l'analyse à la prochaine synchro (voir GET plus bas).
  stoppedForDailyLimit: boolean
}

// Envoie `toAnalyze` à /api/analyze en lots de GROQ_BATCH_SIZE, espacés de
// GROQ_BATCH_DELAY_MS. Une limite PAR MINUTE sur un lot est retentée une fois
// après le délai indiqué par Groq (sans faire échouer le reste de la
// synchro) ; une limite PAR JOUR arrête l'envoi de tout nouveau lot pour
// cette synchro — dans les deux cas, l'appelant (GET ci-dessous) enregistre
// quand même les emails non analysés dans le résultat retourné à
// l'utilisateur, avec analysisStatus resté à 'pending' plutôt que rien.
async function analyzeEmailsInBatches(
  origin: string,
  accessToken: string,
  toAnalyze: any[]
): Promise<AnalyzeBatchOutcome> {
  const analysisById = new Map<string, any>()
  if (toAnalyze.length === 0) return { analysisById, stoppedForDailyLimit: false }

  const batches: any[][] = Array.from(
    { length: Math.ceil(toAnalyze.length / GROQ_BATCH_SIZE) },
    (_, i) => toAnalyze.slice(i * GROQ_BATCH_SIZE, (i + 1) * GROQ_BATCH_SIZE)
  )

  async function callAnalyze(batch: any[]) {
    const res = await fetch(`${origin}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ emails: batch }),
    })
    return res.json()
  }

  const startTime = Date.now()

  for (let i = 0; i < batches.length; i++) {
    if (i > 0 && Date.now() - startTime > MAX_ANALYSIS_DURATION_MS) {
      const remaining = batches.slice(i).reduce((sum, b) => sum + b.length, 0)
      console.log(`⏱️ Budget temps d'analyse dépassé (${MAX_ANALYSIS_DURATION_MS}ms) après ${i} lot(s) — arrêt, ${remaining} email(s) restent en attente pour la prochaine synchro.`)
      break
    }

    const batch = batches[i]
    if (i > 0) await new Promise(resolve => setTimeout(resolve, GROQ_BATCH_DELAY_MS))

    let parsed = await callAnalyze(batch)

    if (parsed.groqError?.type === 'rate_limit_per_minute') {
      const requestedWaitMs = (parsed.groqError.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_RETRY_SECONDS) * 1000
      const remainingBudgetMs = MAX_ANALYSIS_DURATION_MS - (Date.now() - startTime)

      if (remainingBudgetMs <= 0) {
        // Plus de budget disponible pour ce lot : inutile d'attendre pour un
        // retry qu'on abandonnerait de toute façon juste après — on le laisse
        // "en attente" tout de suite (même branche que juste en dessous).
        console.log(`⏳ Rate limit Groq (par minute) sur un lot de ${batch.length} email(s), plus de budget pour retenter — lot laissé en attente.`)
      } else {
        // Plafonné à la fois par MAX_SINGLE_RETRY_WAIT_MS et par le budget
        // restant : sans ça, un délai annoncé par Groq de plusieurs dizaines
        // de secondes ferait à lui seul dépasser tout MAX_ANALYSIS_DURATION_MS
        // en une seule itération (la vérification de budget ne s'exécute
        // qu'ENTRE deux lots) — bug réel constaté en testant ce correctif.
        const waitMs = Math.min(requestedWaitMs, MAX_SINGLE_RETRY_WAIT_MS, remainingBudgetMs)
        console.log(`⏳ Rate limit Groq (par minute) sur un lot de ${batch.length} email(s) — nouvelle tentative dans ${Math.round(waitMs / 1000)}s`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        parsed = await callAnalyze(batch)
      }
    }

    if (parsed.groqError?.type === 'tokens_per_day') {
      const remaining = batches.slice(i).reduce((sum, b) => sum + b.length, 0)
      console.log(`🛑 Limite Groq quotidienne atteinte — arrêt de l'envoi de nouveaux lots (${remaining} email(s) restent en attente pour la prochaine synchro).`)
      return { analysisById, stoppedForDailyLimit: true }
    }

    if (parsed.groqError?.type === 'rate_limit_per_minute') {
      // Toujours rate-limité après la tentative : ce lot reste "en attente"
      // (aucune entrée dans analysisById, donc analysisStatus reste
      // 'pending' pour ses emails) — on continue avec les lots suivants
      // plutôt que d'abandonner toute la synchro pour un incident isolé.
      console.log(`⏳ Toujours rate-limité après la tentative — lot laissé en attente, poursuite avec les lots suivants.`)
      continue
    }

    const results = parsed.results || []
    results.forEach((r: any) => {
      // r.index est relatif à CE lot (buildEmailSummaries numérote les
      // emails du tableau reçu par /api/analyze, qui est ce lot précis) —
      // jamais à toAnalyze dans son ensemble.
      const sourceEmail = batch[r.index]
      if (sourceEmail) analysisById.set(sourceEmail.id, r)
    })
  }

  return { analysisById, stoppedForDailyLimit: false }
}

export async function GET(req: NextRequest) {
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

  const cached = getCachedEmails(user.id)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Cache hit — pas d\'appel Groq')
    return NextResponse.json(cached.data)
  }

  const mailboxes = await getGmailMailboxes(supabase, user.id)
  if (mailboxes.length === 0) {
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 })
  }

  // Emails déjà connus (même si le TTL du cache est dépassé) : base de fusion
  // pour la synchro incrémentale. Leur enrichissement IA/agenda/tâches déjà
  // en place reste valable tel quel — on ne le retouche pas.
  const previouslyCachedAll = (cached?.data?.emails || []) as any[]

  const perMailbox = await Promise.all(
    mailboxes.map(mb => fetchMailboxEmails(
      supabase,
      mb,
      previouslyCachedAll.filter((e: any) => e.mailboxId === mb.id)
    ))
  )
  const merged = perMailbox
    .flat()
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

  // Un même envoi reçu en copie sur deux boîtes connectées a un id Gmail
  // différent dans chacune (propre à la boîte) mais le même Message-ID
  // RFC822 — on ne garde que la première occurrence (déjà triée par date).
  const seenMessageIds = new Set<string>()
  const emails = merged.filter(e => {
    if (!e.messageIdHeader) return true
    if (seenMessageIds.has(e.messageIdHeader)) return false
    seenMessageIds.add(e.messageIdHeader)
    return true
  })

  try {
    // N'envoie à Groq QUE les emails pas encore réellement analysés — pas
    // "absents du cache précédent" : un email peut être EN cache tout en
    // étant resté analysisStatus 'pending' (bloqué par un rate limit Groq
    // lors d'une synchro précédente, voir analyzeEmailsInBatches) ; il doit
    // alors rester éligible ici aussi, sinon il ne serait plus jamais
    // réanalysé — exactement le genre de perte silencieuse à éviter.
    const toAnalyze = emails.filter((e: any) => e.analysisStatus !== 'done')

    const { analysisById, stoppedForDailyLimit } = await analyzeEmailsInBatches(req.nextUrl.origin, accessToken, toAnalyze)

    console.log(`🤖 ${toAnalyze.length} email(s) à analyser sur ${emails.length}, ${analysisById.size} analysé(s) avec succès${stoppedForDailyLimit ? ' (arrêt anticipé : limite Groq quotidienne)' : ''}`)

    const enrichedEmails = emails.map((email: any) => {
      const analysis = analysisById.get(email.id)
      if (!analysis) return email
      return {
        ...email,
        analysisStatus: 'done',
        priority: analysis.priority || 'normal',
        emailType: analysis.type || 'info',
        dailySummary: analysis.dailySummary || '',
        keyPoints: analysis.keyPoints || [],
        hasAIReply: true,
        aiDraftReply: analysis.aiReply || '',
        calendarEventDetected: analysis.hasEvent || false,
        detectedEvent: analysis.hasEvent ? {
          title: analysis.eventTitle,
          date: analysis.eventDate,
          startTime: analysis.eventStartTime,
          endTime: analysis.eventEndTime,
        } : null,
        actionItemDetected: analysis.hasActionItem || false,
        detectedAction: analysis.hasActionItem ? {
          title: analysis.actionTitle,
          priority: analysis.actionPriority,
          dueDate: analysis.actionDueDate,
        } : null,
      }
    })

    // --- Planification automatique de l'agenda, consciente des conflits ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('auto_schedule, work_start, work_end, buffer_minutes, default_event_duration, auto_tasks, auto_archive, plan, timezone')
      .eq('id', user.id)
      .single()

    console.log('🗓️ profile.auto_schedule =', profile?.auto_schedule)

    if (profile?.auto_schedule) {
      const prefs = {
        workStart: profile.work_start?.slice(0, 5) || '09:00',
        workEnd: profile.work_end?.slice(0, 5) || '18:00',
        bufferMinutes: profile.buffer_minutes ?? 15,
        defaultDurationMinutes: profile.default_event_duration ?? 30,
      }

      // Planification automatique : illimitée en Pro, limitée aux 7 prochains
      // jours en Gratuit — au-delà, l'email reste détecté mais l'utilisateur
      // ajoute l'événement lui-même via "Ajouter à l'agenda" (voir EmailDetail).
      const isPro = getPlan(profile.plan).id === 'pro'
      const maxFreeDate = new Date()
      maxFreeDate.setDate(maxFreeDate.getDate() + 7)
      const maxFreeDateIso = maxFreeDate.toISOString().split('T')[0]

      // Copie best-effort vers le vrai Google Calendar, seulement si l'utilisateur
      // l'a connecté (voir /api/calendar/connect) ET si son forfait est Pro —
      // la synchronisation Google Calendar est une fonctionnalité Pro ;
      // sinon calendar_events (interne à Sveltly) reste la seule source.
      const { data: calendarAccount } = isPro
        ? await supabase
            .from('calendar_accounts')
            .select('id, access_token, refresh_token')
            .eq('user_id', user.id)
            .eq('is_connected', true)
            .maybeSingle()
        : { data: null }

      // Restreint aux emails analysés PENDANT cet appel (analysisById) — ceux
      // qui reviennent du cache ont déjà été planifiés (ou pas) lors d'un
      // appel précédent ; l'upsert serait idempotent mais inutile à refaire
      // à chaque poll (toutes les 60s côté client).
      const toSchedule = enrichedEmails.filter(
        (e: any) => analysisById.has(e.id) && e.calendarEventDetected && e.detectedEvent?.date && e.detectedEvent?.startTime
      )

      console.log(`🗓️ ${toSchedule.length} email(s) avec événement détecté sur ${analysisById.size} analysé(s) cette synchro`)
      if (toSchedule.length > 0) {
        console.log('🗓️ Détail des événements détectés:', toSchedule.map((e: any) => ({ subject: e.subject, detectedEvent: e.detectedEvent })))
      }

      // Récupère en une fois tous les événements existants sur les jours concernés,
      // pour vérifier les conflits sans faire une requête par email.
      const uniqueDates = Array.from(new Set(toSchedule.map((e: any) => e.detectedEvent.date)))
      const { data: existingRows } = uniqueDates.length > 0
        ? await supabase
            .from('calendar_events')
            .select('id, date, start_time, end_time, priority, origin, has_attendees, locked')
            .eq('user_id', user.id)
            .in('date', uniqueDates)
        : { data: [] as any[] }

      const existingByDate: Record<string, ArrangeableEvent[]> = {}
      for (const row of existingRows || []) {
        const key = row.date
        if (!existingByDate[key]) existingByDate[key] = []
        existingByDate[key].push({
          id: row.id,
          date: row.date,
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
          priority: row.priority || 'normal',
          origin: row.origin || 'inflo',
          hasAttendees: row.has_attendees ?? false,
          locked: row.locked ?? false,
        })
      }

      for (const email of toSchedule) {
        const ev = email.detectedEvent

        if (!isPro && ev.date > maxFreeDateIso) {
          console.log(`🗓️ [${email.subject}] hors limite forfait Gratuit (>7j) — pas de planification auto`)
          email.autoScheduled = false
          email.schedulingStatus = 'plan_limit'
          continue
        }

        const existingForDay = existingByDate[ev.date] || []
        // La priorité déjà calculée par Groq pour cet email (voir
        // app/api/analyze/route.ts) pilote directement le réarrangement —
        // aucune nouvelle analyse, aucune nouvelle décision ici.
        const eventPriority = email.priority === 'urgent' || email.priority === 'important' ? email.priority : 'normal'

        const result = resolveScheduling(ev.date, ev.startTime, ev.endTime || null, eventPriority, existingForDay, prefs)

        console.log(`🗓️ [${email.subject}] statut:`, result.status, '| date/heure demandées:', ev.date, ev.startTime, ev.endTime)

        if (result.status === 'clear') {
          const { data: inserted, error: insertError } = await supabase
            .from('calendar_events')
            .upsert({
              user_id: user.id,
              title: ev.title || email.subject,
              date: ev.date,
              start_time: result.startTime,
              end_time: result.endTime,
              description: `Ajouté automatiquement depuis : ${email.subject}`,
              color: '#1A73E8',
              priority: eventPriority,
              from_email_id: email.id,
            }, { onConflict: 'user_id,from_email_id' })
            .select()
            .single()

          if (insertError) {
            console.error('❌ Erreur upsert calendar_events:', insertError.message, insertError.details, insertError.hint)
          } else {
            console.log('✅ Événement inséré dans calendar_events:', inserted?.id)
          }

          if (inserted) {
            // origin 'inflo' / hasAttendees false / locked false : mêmes
            // valeurs par défaut qu'à l'insertion — sans ça, un 2e email de
            // ce même lot tombant le même jour traiterait cet événement tout
            // juste créé comme fixe par erreur (propriétés manquantes
            // interprétées comme absentes plutôt que comme leurs défauts).
            existingForDay.push({
              id: inserted.id,
              date: ev.date,
              startTime: result.startTime,
              endTime: result.endTime,
              priority: eventPriority,
              origin: 'inflo',
              hasAttendees: false,
              locked: false,
            })
            existingByDate[ev.date] = existingForDay

            if (calendarAccount?.access_token) {
              const googleEventId = await createGoogleCalendarEvent(supabase, calendarAccount, {
                title: ev.title || email.subject,
                description: `Ajouté automatiquement depuis : ${email.subject}`,
                date: ev.date,
                startTime: result.startTime,
                endTime: result.endTime,
                timeZone: profile.timezone || 'Europe/Paris',
              })
              if (googleEventId) {
                await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', inserted.id)
              }
            }
          }

          email.autoScheduled = true
          email.schedulingStatus = 'clear'
        } else {
          // Conflit (y compris "déplacerait des événements moins prioritaires") :
          // ne crée et ne déplace rien automatiquement — le frontend proposera
          // à l'utilisateur de choisir via le bouton "Ajouter à l'agenda" manuel
          // (voir InboxSidePanel.tsx), avec le plan déjà calculé pour éviter un
          // second calcul.
          email.autoScheduled = false
          email.schedulingStatus = result.status
          email.schedulingConflicts = result.conflicts
          email.schedulingAlternative = result.alternative
          email.schedulingDisplaced = result.displaced
        }
      }
    }

    // --- Création automatique de tâches depuis les demandes d'action sans date ---
    // Indépendant du bloc agenda ci-dessus : hasEvent et hasActionItem couvrent
    // des demandes différentes (voir SYSTEM_PROMPT), un même email peut alimenter
    // les deux, un seul, ou aucun des deux blocs.
    if (profile?.auto_tasks) {
      // Même logique que toSchedule ci-dessus : seuls les emails nouvellement
      // analysés déclenchent une création de tâche, jamais ceux qui reviennent
      // du cache (déjà traités lors d'un appel précédent).
      // Filet de sécurité supplémentaire (voir déjà enforceInformationalNoAction
      // dans app/api/analyze/route.ts, qui corrige actionItemDetected à la
      // source pour ces mêmes types) — un email purement informatif ne doit
      // jamais générer de tâche à faire, même si une entrée en cache plus
      // ancienne (créée avant ce correctif) avait encore actionItemDetected
      // à true.
      const toCreateTasks = enrichedEmails.filter(
        (e: any) => analysisById.has(e.id) && e.actionItemDetected && e.detectedAction?.title
          && !NO_TASK_EMAIL_TYPES.has(e.emailType)
      )

      for (const email of toCreateTasks) {
        const action = email.detectedAction
        const { error: taskError } = await supabase
          .from('tasks')
          .upsert({
            user_id: user.id,
            title: action.title,
            priority: action.priority || 'medium',
            due_date: action.dueDate || null,
            completed: false,
            // Le nom de l'expéditeur (même valeur que handleAddTask dans
            // InboxSidePanel.tsx, l'autre façon de créer une tâche depuis un
            // email) — pas le littéral 'email' : category s'affiche sous le
            // titre de la tâche (voir TasksCard/app/(app)/tasks), juste à
            // côté du badge enveloppe qui dit déjà "vient d'un email" ; y
            // répéter le mot "email" n'apportait aucune information en plus,
            // alors que le nom de l'expéditeur en apporte une vraie.
            category: email.sender || 'email',
            from_email_id: email.id,
          }, { onConflict: 'user_id,from_email_id' })

        if (taskError) {
          console.error('❌ Erreur upsert tasks:', taskError.message, taskError.details, taskError.hint)
        } else {
          email.autoTaskCreated = true
        }
      }
    }

    // --- Archivage automatique des emails normaux anciens ---
    // Réglage "Archivage automatique" (Réglages > IA) — jusqu'ici un simple
    // interrupteur visuel, jamais chargé ni sauvegardé, jamais consommé par
    // aucune logique serveur malgré sa description explicite ("déplace les
    // newsletters et emails normaux hors de votre boîte après 7 jours").
    // Indépendant des emails nouvellement analysés cette synchro (contrairement
    // aux blocs ci-dessus) : un email "normal" déjà en cache depuis longtemps
    // doit aussi devenir éligible, pas seulement ceux tout juste classés.
    if (profile?.auto_archive) {
      const archiveCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const eligible = enrichedEmails
        .filter((e: any) =>
          e.priority === 'normal' &&
          e.labelIds?.includes('INBOX') &&
          new Date(e.receivedAt) < archiveCutoff
        )
        // Les plus anciens d'abord : en cas de gros arriéré, chaque synchro
        // progresse sur les emails les plus en retard plutôt que de piocher
        // au hasard dans le tableau à chaque appel.
        .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
        // Plafond par synchro — un arriéré important (première activation du
        // réglage sur une vieille boîte) ne doit pas faire gonfler le temps
        // de cette requête déjà contrainte par MAX_ANALYSIS_DURATION_MS :
        // le reste sera traité aux synchros suivantes (poll client ~60s).
        .slice(0, 15)

      for (const email of eligible) {
        try {
          const result = await tryAcrossMailboxes(supabase, user.id, (token) =>
            fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
            })
          )
          if (result && !result.data?.error) {
            email.labelIds = (email.labelIds || []).filter((l: string) => l !== 'INBOX')
            email.autoArchived = true
          }
        } catch (err) {
          console.error(`❌ Erreur archivage auto de l'email ${email.id}:`, err)
        }
      }

      if (eligible.length > 0) {
        console.log(`🗄️ Archivage automatique : ${eligible.length} email(s) normal/normaux de plus de 7 jours traité(s)`)
      }
    }

    setCachedEmails(user.id, { emails: enrichedEmails })
    return NextResponse.json({ emails: enrichedEmails })

  } catch (err) {
    console.error('Erreur analyse IA:', err)
    setCachedEmails(user.id, { emails })
    return NextResponse.json({ emails })
  }
}
