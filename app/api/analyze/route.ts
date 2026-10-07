import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { getPlan } from '@/lib/plans'
import { resolveMonthlyUsage } from '@/lib/ai-usage'
import { Tone, TONE_LABEL, TONE_INSTRUCTIONS, TONE_SHARED_RULES, resolveToneLabel, ReplyLanguage, resolveReplyLanguage, replyLanguageInstruction } from '@/lib/tone'

// Construit le bloc de consignes de ton injecté dans le prompt système — SEULEMENT
// pour les tons réellement utilisés par les emails de CE lot précis, plutôt que de
// toujours inclure les 3 tons existants quel que soit le besoin. Le prompt système
// pèse déjà une grosse partie du budget TPM (tokens/minute) du tier Groq gratuit —
// chaque bloc de ton économisé (la plupart des lots n'en utilisent qu'un) rend de la
// marge pour le contenu réel des emails (voir buildSystemPrompt ci-dessous).
function buildToneSection(tones: Tone[]): string {
  const unique = Array.from(new Set(tones))
  const blocks = unique.map(t => `**Ton demandé: ${TONE_LABEL[t]}**\n${TONE_INSTRUCTIONS[t]}`).join('\n\n')
  return `${blocks}\n\n${TONE_SHARED_RULES}\n\n(Ces consignes de ton s'appliquent uniquement aux emails professionnels/personnels qui reçoivent une vraie réponse — pas aux cas scam/newsletter ci-dessous, qui ont leur propre format fixe.)`
}

// Prompt système condensé — reconstruit à chaque appel avec uniquement les tons
// nécessaires (voir buildToneSection). Condensé par rapport à sa version précédente
// (qui pesait à elle seule ~5000 tokens, soit plus de la moitié du budget TPM de
// 8000 du tier Groq gratuit pour gpt-oss-120b, et déclenchait régulièrement des 413
// "tokens per minute" dès qu'un lot de plusieurs emails s'y ajoutait) : chaque règle
// de classification est conservée, seule la prose explicative a été resserrée.
function buildSystemPrompt(toneSection: string): string {
  return `Tu es un assistant intelligent qui analyse des emails pour un professionnel. Tu dois être rigoureux et cohérent — un mauvais classement a un coût réel pour l'utilisateur (il peut rater une urgence, ou être noyé de fausses urgences).

## LANGUE DE SORTIE
dailySummary et keyPoints : TOUJOURS en français, quelle que soit la langue de l'email (ce sont des champs internes à l'interface de Sveltly). aiReply : dans la langue indiquée par "Langue de réponse demandée: X" de CET email précis — peut différer du français.

## NE JAMAIS INVENTER
Toute affirmation (priorité, résumé, date, montant, nom) doit venir d'un élément RÉELLEMENT présent dans l'email. Une info manquante → formule sans elle, ne la devine jamais. Une donnée inventée est pire qu'une absence.

## MÉTHODE (dans l'ordre, pour CHAQUE email)

**Étape 1 — ANTI-SPAM/PROMO, à vérifier EN PREMIER, avant tout jugement de contenu.** priority="normal" automatiquement, quel que soit le contenu par ailleurs (même argent/délai/menace/mot "urgent"), dès qu'au moins UN signal concret est présent :
- Lien/mention de désabonnement ("se désabonner", "unsubscribe", "gérer mes préférences")
- "généré automatiquement", "ne pas répondre à cet email", "no-reply"/"noreply"
- Expéditeur automatisé/commercial (newsletter@, marketing@, no-reply@, notifications@, promo@, domaine retailer/e-commerce connu)
- Structure newsletter commerciale (liens CGU/confidentialité en pied de page, tracking utm_/_x_cid/_x_src/mc_eid dans les URLs)
- Contenu principal = offre commerciale, réduction, code promo, vente flash, compte à rebours marketing, lancement produit
Si présent : type = "promo"/"newsletter"/"notification"/"spam" selon le cas, priority TOUJOURS "normal", sans exception. Le TON marketing (emojis, "offre limitée", "dernières heures", "urgent", "aujourd'hui seulement") NE FAIT JAMAIS monter la priorité. Passe directement au JSON, sans les étapes suivantes.

**Étape 2 —** sinon identifie le TYPE : professionnel / personnel (famille, amis) / scam-phishing. Si scam/phishing : priority="normal" directement (voir format dédié plus bas), sans étape 3.

**Étape 3 —** sinon détermine la priorité à partir de SIGNAUX CONCRETS du contenu réel, jamais d'une impression générale ou du ton d'écriture.

**"urgent"** (action immédiate ou dans les heures qui suivent) — au moins UN signal concret, jamais un ton pressant seul :
- Échéance légale/réglementaire le jour même ou le lendemain ; document officiel à délai très court (convocation, mise en demeure, assignation)
- Paiement en retard avec menace (pénalité, interruption de service, mise en demeure, compte bloqué)
- Réunion/rdv dans les prochaines heures nécessitant préparation ou confirmation
- Dépendance bloquante explicite avec coût concret énoncé ("je ne peux pas signer sans ton accord") ou client menaçant de rompre/partir immédiatement
- Incident de sécurité (compte compromis) ou panne/incident bloquant en cours
- Validation/signature requise avant une date butoir le jour même
- Urgence sectorielle explicite : médicale/patient, accident/sécurité chantier, sinistre assurance à déclarer sous 24-48h, visa/titre de séjour, mise en demeure URSSAF/fiscale, licenciement, accident du travail, dégât des eaux/panne de chauffage en cours
- Urgence personnelle réelle (santé, accident, famille) — jamais une urgence commerciale déguisée

**"important"** (attention/action requise, pas immédiat) — aucun signal "urgent" ci-dessus, mais au moins un de ces cas :
- Demande/question/retour d'un client/partenaire/collègue sans délai précisé
- Devis/contrat/proposition à examiner, facture à traiter, relance standard (pas encore critique)
- Rdv à planifier ; livrable à valider ou relire
- Renouvellement à venir (abonnement, assurance, domaine, bail) sans urgence immédiate
- Partenariat/networking, candidature, demande d'entretien ou de référence
- Mise à jour d'un outil nécessitant une config ; document admin à transmettre (hors échéance fiscale stricte)
- Notification bancaire à vérifier (sans blocage) ; document officiel à traiter sous quelques jours, sans délai serré

**"normal"** — tout le reste : information, confirmation déjà actée, remerciement, rien à faire, ou tout email couvert par l'Étape 1.

## PIÈGES — ne comptent JAMAIS comme "urgent"
- "urgent"/"important"/"ASAP"/"critique"/"aujourd'hui"/"immédiat" écrit SANS élément concret derrière → ignore le mot, il ne prouve rien seul.
- Offre à durée "limitée", compte à rebours marketing, tout email couvert par l'Étape 1 → jamais urgent ni important, même avec un vocabulaire alarmiste.
- Ton pressant, familier ou insistant seul → ne change PAS la priorité.
- Demande générale sans date ("quand tu peux", "pas de rush") → "important" ou "normal" selon le contenu, jamais "urgent".

## VÉRIFICATION FINALE
Classer à tort en "urgent" noie l'utilisateur sous de fausses alertes ; à tort en "normal" lui fait rater quelque chose de réel. En cas d'hésitation réelle entre deux niveaux, descends TOUJOURS d'un niveau (urgent→important→normal), jamais l'inverse. Ne classe "urgent" que si tu peux citer le signal précis qui le justifie. L'anti-spam de l'Étape 1 prime sur tout en cas de doute.

## EXEMPLES DE CLASSIFICATION
- "URGENT : Dernières heures ! -50% sur toute la boutique, offre finit ce soir. Se désabonner." → priority="normal", type="promo" (désabonnement + offre commerciale : l'Étape 1 s'applique intégralement, "URGENT" ne compte pour rien).
- "Le serveur de production est down depuis 10 minutes, les clients ne peuvent plus se connecter." → priority="urgent", type="task" (panne bloquante en cours, signal concret explicite).
- "Facture n°2291, 540€, à régler sous 30 jours." → priority="important", type="invoice" (délai de 30 jours, donc pas de signal "urgent").
- "Newsletter hebdo : nouveautés produit, gérez vos préférences d'abonnement ici." → priority="normal", type="newsletter" (Étape 1 : expéditeur automatisé + gestion de préférences).
- "Le client a besoin du devis signé avant 17h aujourd'hui pour valider son budget." → priority="urgent", type="client_request" (délai explicite + dépendance bloquante).
- "Pouvez-vous me faire une proposition de contrat pour le poste de développeur ?" → priority="important", type="job" (action réelle, aucun délai serré).

## RIGUEUR
Relis l'email avant de rédiger (as-tu compris ce qui est vraiment demandé, pas juste le sujet apparent ?). Couvre TOUS les points soulevés, pas seulement le premier. Bannis toute tournure vague ou esquive dans ta propre réponse.

## QUI TU ES DANS CETTE TÂCHE
Tu n'es PAS un assistant qui conseille — tu ES l'utilisateur : tu rédiges la réponse à sa place, à la première personne, prête à être envoyée telle quelle.
- INTERDIT : "Vous pourriez répondre...", "Je vous propose de...", parler de l'expéditeur à la 3e personne ("L'expéditeur souhaite...")
- OBLIGATOIRE : écris directement le texte final, comme si tu prenais le clavier à la place de l'utilisateur ("Bonjour, merci pour votre message. Je confirme la réunion de...")
- Prends de vraies décisions (accepter/refuser/proposer une alternative) selon ce que dit l'email, ne reste pas vague pour "laisser le choix"
- Aucun commentaire ni note entre parenthèses — juste le texte brut, prêt à partir.

## TYPE D'EMAIL — à déterminer en plus de la priorité
"meeting" (réunion/rdv) · "deadline" (échéance à respecter) · "task" (tâche demandée directement) · "client_request" (demande client) · "confirmation" (déjà en cours) · "change" (modification/annulation d'un événement prévu) · "invoice" (facture/paiement) · "job" (candidature/opportunité pro) · "info" (info importante sans action immédiate) · "newsletter" · "promo" · "notification" (automatique) · "spam"

## COHÉRENCE TYPE/ÉVÉNEMENT (RÈGLE CRITIQUE)
Si type = "meeting" ou "change" → "hasEvent" DOIT être true (jamais false, c'est une incohérence interdite). Quand hasEvent est true, tu DOIS remplir eventTitle, eventDate, eventStartTime (et eventEndTime si déductible) — jamais null dans ce cas.

## DÉTECTION D'ACTION SANS DATE PRÉCISE — "hasActionItem"
En plus de "hasEvent" (rdv avec date ET heure identifiables), détecte séparément une demande d'ACTION SANS créneau précis — une chose à faire, sans rendez-vous associé (ex: "peux-tu m'envoyer le devis", "il faut valider ce document").

Si présente, mets "hasActionItem" à true et remplis :
- "actionTitle" : titre court à l'impératif, basé sur un élément réel de l'email (destinataire, objet précis), jamais générique comme "Traiter l'email"
- "actionPriority" : "high" (ton/contexte pressant ou important), "medium" (demande normale), "low" (accessoire/secondaire)
- "actionDueDate" : si une échéance est mentionnée même vaguement ("avant vendredi", "cette semaine"), calcule la date calendaire réelle (même méthode que eventDate) au format YYYY-MM-DD. Sinon null — n'invente jamais une date.

**hasEvent et hasActionItem sont INDÉPENDANTS** — un email peut avoir l'un, l'autre, les deux, ou aucun. Jamais hasActionItem=true pour la MÊME demande déjà couverte par hasEvent (ex: "viens à cette réunion" = hasEvent seul). Email purement informatif (promo, notification, newsletter, confirmation déjà actée) → les deux à false. Si hasActionItem est false, laisse actionTitle/actionPriority/actionDueDate à null.

**EXCLUSIONS OBLIGATOIRES — jamais hasActionItem=true pour :**
- Une action de sécurité à usage unique et éphémère : code de vérification/2FA à saisir, lien de réinitialisation de mot de passe, confirmation d'adresse email. Ces actions expirent en quelques minutes — en faire une tâche persistante n'a aucun sens, elle est déjà obsolète quand l'utilisateur la voit. type="notification" dans ce cas, pas "task".
- Une sollicitation marketing déguisée en demande directe (répondre à un sondage, s'inscrire à une offre, "profitez-en maintenant") : même si l'email est formulé à l'impératif ("Commencez le sondage"), ce n'est pas une tâche pour l'utilisateur — c'est de la promo. type="promo", pas "task".

## DATES RELATIVES — CALCUL OBLIGATOIRE
Chaque email a sa propre date de réception ("Reçu le: ...") — c'est CETTE date qui sert de référence pour ses dates relatives, jamais la date du jour où tu traites la requête. "demain"/"lundi prochain"/"vendredi" → calcule la vraie date calendaire depuis la réception de CET email, au format YYYY-MM-DD (jamais de texte comme "demain"). Exemple : reçu lundi 2 mars, "réunion demain à 15h" → eventDate="2026-03-03", même si tu traites l'analyse plus tard dans la semaine. eventStartTime au format HH:MM (24h, zéro devant si besoin : "09:00" pas "9:00"). Si une date de réunion est donnée sans heure → hasEvent=true, eventDate rempli, eventStartTime=null dans ce cas précis uniquement.

## RÉSUMÉ DU JOUR (dailySummary) — une phrase simple par email
3e personne (contrairement à aiReply qui est à la 1re), commençant par "Vous avez reçu un email concernant..." ou équivalent naturel adapté au contenu. Une seule phrase, simple, concrète, spécifique au contenu réel — jamais de formulation générique.
Ex. : meeting → "Vous avez reçu une invitation à une réunion avec l'équipe marketing jeudi à 14h." · invoice → "Une facture de 340€ est à régler avant le 15." · spam → "Un message suspect prétendant venir de votre banque a été reçu."

## POINTS CLÉS
Pour les emails pro qui listent plusieurs éléments concrets : 2 à 4 points courts (3-6 mots chacun) dans "keyPoints". Sinon tableau vide [].

## TON DE LA RÉPONSE — OBLIGATOIRE
Chaque email ci-dessous indique une ligne "Ton demandé: X". Applique EXACTEMENT les consignes du ton correspondant pour CET email précis — deux emails du même lot peuvent demander des tons différents, ne les mélange jamais.

${toneSection}

## RÈGLES PAR TYPE D'EMAIL

**Email professionnel** : ton sérieux, formule adaptée (Bonjour/Cordialement), réponse précise et structurée selon la demande, longueur adaptée (courte si simple, détaillée si complexe).

**Email familial ou ami** : ton chaleureux et naturel, pas de formules trop formelles, réponse courte et directe.

**Scam / Phishing** : jamais de texte générique — explique en une phrase précise CE QUI, dans cet email précis, a déclenché la suspicion, en citant l'élément concret.
- aiReply : "[élément précis détecté] — ceci ressemble à une tentative de phishing. Ne cliquez sur aucun lien et ne répondez pas." (ex: "L'expéditeur usurpe visiblement l'identité d'une banque mais l'adresse email ne correspond pas à un domaine officiel — ceci ressemble à une tentative de phishing.")
- priority : "normal"

**Newsletter / Notification automatique** : jamais de texte générique — résume en une phrase ce dont parle CETTE notification précise.
- aiReply : "[résumé concret du contenu]. Aucune réponse nécessaire."
- priority : "normal"

## FORMAT DE RÉPONSE
Retourne UNIQUEMENT un JSON valide :
{"results": [{"index": 0, "priority": "urgent", "type": "meeting", "dailySummary": "réponse rédigée ici", "keyPoints": ["Bilan du projet", "Prochaines étapes"], "hasEvent": true, "eventTitle": "Réunion avec M. Lavoisier", "eventDate": "2026-09-06", "eventStartTime": "15:00", "eventEndTime": null, "hasActionItem": false, "actionTitle": null, "actionPriority": null, "actionDueDate": null, "aiReply": "réponse rédigée ici"}]}`
}

// Emails générés par Sveltly lui-même (digest quotidien, notifications système) —
// jamais envoyés au pipeline IA, ça n'a aucun sens d'y répondre.
const SYSTEM_SENDERS = ['onboarding@resend.dev', 'digest@sveltly.app']

// Extrait le délai d'attente d'un message d'erreur Groq de type "Please try
// again in 7m13.728s." ou "Please try again in 45.2s." — même regex que
// app/api/regenerate-reply/route.ts (dupliquée volontairement : chaque route
// Groq reste autonome plutôt que de dépendre d'un module partagé pour un
// helper aussi petit). Retourne null (jamais une exception) si le format a
// changé côté Groq.
function parseGroqRetryAfterSeconds(message: string): number | null {
  const match = message.match(/in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i)
  if (!match) return null
  const minutes = match[1] ? parseInt(match[1], 10) : 0
  const seconds = parseFloat(match[2])
  if (isNaN(minutes) || isNaN(seconds)) return null
  return Math.ceil(minutes * 60 + seconds)
}

// Groq distingue plusieurs fenêtres de rate limit dans le texte de son
// message d'erreur (ex: "on tokens per day (TPD)" / "on requests per minute
// (RPM)" / "on tokens per minute (TPM)") — seule la limite PAR JOUR ne se
// lèvera pas avant le lendemain ; toutes les autres sont des limites courtes
// qui valent la peine d'être retentées dans la minute. C'est cette
// distinction (pas seulement "429 ou pas") qui détermine si /api/emails doit
// réessayer un lot ou arrêter d'en envoyer pour le reste de la synchro.
function classifyGroqRateLimit(message: string): 'tokens_per_day' | 'rate_limit_per_minute' {
  return /per day/i.test(message) ? 'tokens_per_day' : 'rate_limit_per_minute'
}

function classifyByKeywords(subject: string, body: string): 'urgent' | 'important' | 'normal' {
  const text = (subject + ' ' + body).toLowerCase()
  const urgentWords = ['urgent', 'immédiat', 'aujourd\'hui', 'retard', 'impayé', 'relance', 'deadline', 'asap', 'critique', 'avant', 'rapidement', 'dès que possible']
  const importantWords = ['devis', 'facture', 'réunion', 'rendez-vous', 'demande', 'client', 'contrat', 'proposition', 'projet', 'dossier', 'préparer']
  if (urgentWords.some(w => text.includes(w))) return 'urgent'
  if (importantWords.some(w => text.includes(w))) return 'important'
  return 'normal'
}

function detectEvent(subject: string, body: string) {
  const text = (subject + ' ' + body).toLowerCase()
  return ['réunion', 'rendez-vous', 'meeting', 'conférence', 'appel', 'entretien', 'invitation'].some(w => text.includes(w))
}

function buildFallback(emails: any[]) {
  return emails.map((e: any, i: number) => ({
    index: i,
    priority: classifyByKeywords(e.subject, e.body || e.preview || ''),
    hasEvent: detectEvent(e.subject, e.body || e.preview || ''),
    eventTitle: null,
    eventDate: null,
    eventStartTime: null,
    eventEndTime: null,
    // Pas de détection par mots-clés pour les tâches (contrairement à hasEvent) :
    // générer un actionTitle plausible sans IA risquerait de créer des tâches au
    // titre incohérent. En mode dégradé, on préfère ne rien créer plutôt que mal.
    hasActionItem: false,
    actionTitle: null,
    actionPriority: null,
    actionDueDate: null,
    aiReply: `Bonjour,\n\nMerci pour votre message concernant "${e.subject}".\n\nJe reviens vers vous rapidement.\n\nCordialement`,
  }))
}

function buildEmailSummaries(
  list: any[],
  maxCharsPerEmail: number,
  getTone: (e: any, i: number) => Tone,
  getLanguage: (e: any, i: number) => ReplyLanguage
) {
  return list.map((e: any, i: number) => {
    const receivedLabel = e.receivedAt
      ? new Date(e.receivedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'inconnue'
    return `Email ${i + 1}:\nReçu le: ${receivedLabel}\nSujet: ${e.subject}\nDe: ${e.sender} <${e.senderEmail}>\nTon demandé: ${TONE_LABEL[getTone(e, i)]}\nLangue de réponse demandée: ${replyLanguageInstruction(getLanguage(e, i))}\nContenu: ${(e.body || e.preview || '').slice(0, maxCharsPerEmail)}`
  }).join('\n\n---\n\n')
}

function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Filet de sécurité : force la cohérence type/hasEvent même si le modèle se
// trompe. Ne force hasEvent à true que si eventDate est réellement exploitable
// — sinon le frontend affichait "événement détecté" sans aucune date à
// afficher ou à planifier (incohérence silencieuse plutôt qu'une correction).
function enforceEventConsistency(result: any) {
  if (!result || typeof result !== 'object') return result

  const isMeetingLike = result.type === 'meeting' || result.type === 'change'
  if (isMeetingLike && !result.hasEvent) {
    result.hasEvent = !!result.eventDate
  }
  return result
}

// Filet de sécurité : reprend exactement la catégorie "purement informatif"
// déjà définie dans buildSystemPrompt ci-dessus ("promo, notification
// automatique, newsletter, confirmation déjà actée" + spam/scam-phishing,
// qui suit le même format fixe) — ces types ne doivent JAMAIS déclencher de
// création automatique, ni tâche (voir le bloc auto-tasks dans
// app/api/emails/route.ts), ni événement d'agenda, même si le modèle
// outrepasse la consigne (ex: un phishing avec un faux appel à l'action
// pressant "cliquez ici pour valider votre paiement sous 24h", une pub avec
// un compte à rebours "offre expire ce soir, confirmez avant minuit", ou une
// confirmation de réservation qui mentionne une date en passant). Corrigé
// ici, à la source, plutôt que de compter sur chaque consommateur en aval
// pour re-vérifier le type.
const NO_ACTION_EMAIL_TYPES = new Set(['spam', 'promo', 'newsletter', 'notification', 'confirmation'])

function enforceInformationalNoAction(result: any) {
  if (!result || typeof result !== 'object') return result
  if (!NO_ACTION_EMAIL_TYPES.has(result.type)) return result

  result.hasActionItem = false
  result.actionTitle = null
  result.actionPriority = null
  result.actionDueDate = null
  result.hasEvent = false
  result.eventTitle = null
  result.eventDate = null
  result.eventStartTime = null
  result.eventEndTime = null
  return result
}

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
  const userId = user.id

  const { emails } = await req.json()
  if (!emails || emails.length === 0) return NextResponse.json({ results: [] })

  // Exclut les emails générés par Sveltly lui-même avant tout traitement
  const filtered = emails.filter((e: any) => !SYSTEM_SENDERS.includes((e.senderEmail || '').toLowerCase()))
  if (filtered.length === 0) return NextResponse.json({ results: [] })

  // Applique réellement la limite mensuelle du plan gratuit (jusqu'ici purement
  // affichée dans les paramètres, jamais vérifiée). Le compteur se réinitialise
  // au changement de mois calendaire.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, ai_replies_count, ai_replies_reset_at, reply_tone, reply_language')
    .eq('id', userId)
    .single()

  const plan = getPlan(profile?.plan)
  const monthlyLimit = plan.limits.aiRepliesPerMonth
  const { today, currentCount } = resolveMonthlyUsage(profile)

  if (monthlyLimit !== null && currentCount >= monthlyLimit) {
    // Limite atteinte : on garde un classement basique par mots-clés (gratuit,
    // pas d'appel Groq) plutôt que de bloquer complètement l'utilisateur.
    return NextResponse.json({ results: buildFallback(filtered), limitReached: true })
  }

  // Incrément atomique côté base (fonction increment_ai_usage) plutôt qu'un
  // read-modify-write applicatif : deux appels concurrents (ce lot + une
  // régénération simultanée) ne peuvent plus s'écraser mutuellement.
  // Best-effort : ne bloque jamais la réponse si l'écriture du compteur échoue.
  async function incrementUsage(n: number) {
    try {
      await supabase.rpc('increment_ai_usage', { p_n: n, p_today: today.toISOString().slice(0, 10) })
    } catch (err) {
      console.error('Erreur incrémentation ai_replies_count:', err)
    }
  }

  // Résolution du ton par email : contact (surcharge par expéditeur) > profil
  // global > "professional" par défaut. Une seule requête pour tous les
  // contacts avec un ton défini, plutôt qu'une requête par email.
  const { data: contactRows } = await supabase
    .from('contacts')
    .select('email, reply_tone')
    .eq('user_id', userId)
    .not('reply_tone', 'is', null)

  const contactTones = new Map((contactRows || []).map(c => [c.email.toLowerCase(), c.reply_tone as Tone]))
  const globalTone = resolveToneLabel(profile?.reply_tone)
  const resolveTone = (e: any) => contactTones.get((e.senderEmail || '').toLowerCase()) ?? globalTone

  // Langue de aiReply — réglage global du profil uniquement (pas de surcharge
  // par contact, contrairement au ton).
  const globalReplyLanguage = resolveReplyLanguage(profile?.reply_language)
  const resolveLanguage = () => globalReplyLanguage

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  try {
    // Le nombre d'emails envoyés est déjà borné par l'appelant (voir /api/emails) —
    // on ne re-tronque pas ici pour éviter toute incohérence entre les deux limites.
    const limited = filtered
    // 1500 (pas 2000) : laisse plus de marge au budget TPM du tier Groq gratuit
    // (8000 tokens/minute) maintenant que l'appelant envoie des lots plus petits
    // mais toujours potentiellement plusieurs emails par appel.
    const emailSummaries = buildEmailSummaries(limited, 1500, resolveTone, resolveLanguage)
    const systemPrompt = buildSystemPrompt(buildToneSection(limited.map((e: any) => resolveTone(e))))

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      // 2200 (pas 2500) : sur un lot de 3 emails max désormais (voir
      // GROQ_BATCH_SIZE dans /api/emails), largement suffisant pour le JSON de
      // sortie — et ce budget est compté dans le total "demandé" par Groq pour
      // la limite TPM, donc chaque token non réservé ici est de la marge en plus.
      max_tokens: 2200,
      temperature: 0.15,
      reasoning_effort: 'medium',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Date actuelle (repère général uniquement — ne sert PAS de référence pour les dates relatives des emails, chaque email a sa propre date de réception indiquée) : ${todayLabel()}.\n\nAnalyse ces ${limited.length} emails en suivant strictement la méthode donnée :\n\n${emailSummaries}`
        }
      ]
    })

    const content = completion.choices[0].message.content || '{}'
    console.log('Groq réponse complète:', content)

    const parsed = JSON.parse(content)
    if (Array.isArray(parsed.results)) {
      parsed.results = parsed.results.map(enforceEventConsistency).map(enforceInformationalNoAction)
    }
    await incrementUsage(limited.length)
    return NextResponse.json(parsed)

  } catch (err: any) {
    console.error('❌ Groq indisponible. Raison:', err?.message, err?.status)

    // groq-sdk imbrique le corps d'erreur réel sous err.error.error (voir
    // node_modules/groq-sdk/core/error.js) — err.message n'est qu'une chaîne
    // de repli, pas la donnée structurée (même remarque que
    // app/api/regenerate-reply/route.ts).
    const groqErrorCode = err?.error?.error?.code
    const groqErrorMessage: string = err?.error?.error?.message || err?.message || ''
    const isRateLimit = groqErrorCode === 'rate_limit_exceeded' || err?.status === 429 || err?.status === 413 || groqErrorMessage.includes('rate_limit_exceeded')

    if (isRateLimit) {
      const rateLimitType = classifyGroqRateLimit(groqErrorMessage)

      // Limite PAR JOUR : aucun retry n'a de sens avant demain — le signaler
      // directement à l'appelant (/api/emails) plutôt que de deviner une
      // classification par mots-clés qui serait ensuite mise en cache comme
      // si elle était fiable. L'appelant sait alors qu'il doit arrêter
      // d'envoyer de nouveaux lots et laisser ces emails "en attente".
      if (rateLimitType === 'tokens_per_day') {
        return NextResponse.json({
          results: [],
          groqError: {
            type: 'tokens_per_day' as const,
            message: groqErrorMessage,
            retryAfterSeconds: parseGroqRetryAfterSeconds(groqErrorMessage),
          },
        })
      }

      // Limite PAR MINUTE : un seul retry avec un email et moins de contenu —
      // elle se lève généralement en quelques dizaines de secondes.
      try {
        await new Promise(resolve => setTimeout(resolve, 2000))

        const retryLimited = filtered.slice(0, 1)
        const retrySummary = buildEmailSummaries(retryLimited, 800, resolveTone, resolveLanguage)
        const retrySystemPrompt = buildSystemPrompt(buildToneSection(retryLimited.map((e: any) => resolveTone(e))))

        const retryCompletion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          max_tokens: 1200,
          temperature: 0.2,
          reasoning_effort: 'low',
          reasoning_format: 'hidden',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: retrySystemPrompt },
            { role: 'user', content: `Date actuelle (repère général uniquement — ne sert PAS de référence pour les dates relatives, l'email a sa propre date de réception indiquée) : ${todayLabel()}.\n\nAnalyse cet email en suivant strictement la méthode donnée :\n\n${retrySummary}` }
          ]
        })

        const retryContent = retryCompletion.choices[0].message.content || '{}'
        console.log('Groq réponse complète (retry):', retryContent)

        const retryParsed = JSON.parse(retryContent)
        if (Array.isArray(retryParsed.results)) {
          retryParsed.results = retryParsed.results.map(enforceEventConsistency).map(enforceInformationalNoAction)
        }
        await incrementUsage(retryLimited.length)
        return NextResponse.json(retryParsed)
      } catch (retryErr: any) {
        console.error('❌ Retry Groq également échoué:', retryErr?.message)

        const retryGroqMessage: string = retryErr?.error?.error?.message || retryErr?.message || ''
        const retryType = retryGroqMessage ? classifyGroqRateLimit(retryGroqMessage) : rateLimitType

        // Toujours pas d'analyse possible après le retry : signale "en
        // attente" au lieu d'un fallback par mots-clés — un lot entier resté
        // bloqué par le rate limit doit être retenté à la prochaine synchro,
        // pas classifié à la légère et mis en cache comme définitif.
        return NextResponse.json({
          results: [],
          groqError: {
            type: retryType,
            message: retryGroqMessage || groqErrorMessage,
            retryAfterSeconds: parseGroqRetryAfterSeconds(retryGroqMessage) ?? parseGroqRetryAfterSeconds(groqErrorMessage),
          },
        })
      }
    }

    // Erreur non liée au rate limit (réseau, parsing, panne ponctuelle...) :
    // on garde le filet de sécurité par mots-clés existant, toujours
    // préférable à rien pour ce cas rare et non systématique.
    return NextResponse.json({ results: buildFallback(filtered) })
  }
}
