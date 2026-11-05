import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { getPlan } from '@/lib/plans'
import { resolveMonthlyUsage, plafondQuotidien } from '@/lib/ai-usage'
import { Tone, TONE_LABEL, TONE_INSTRUCTIONS, TONE_SHARED_RULES, resolveToneLabel, ReplyLanguage, resolveReplyLanguage, replyLanguageInstruction } from '@/lib/tone'
import { routeJson } from '@/lib/api-handler'

// Construit le bloc de consignes de ton injecté dans le prompt système — SEULEMENT
// pour les tons réellement utilisés par les emails de CE lot précis, plutôt que de
// toujours inclure les 3 tons existants quel que soit le besoin. Le prompt système
// pèse déjà une grosse partie du budget de tokens du palier Groq gratuit —
// chaque bloc de ton économisé (la plupart des lots n'en utilisent qu'un) rend de la
// marge pour le contenu réel des emails (voir buildSystemPrompt ci-dessous).
function buildToneSection(tones: Tone[]): string {
  const unique = Array.from(new Set(tones))
  const blocks = unique.map(t => `**Ton demandé: ${TONE_LABEL[t]}**\n${TONE_INSTRUCTIONS[t]}`).join('\n\n')
  return `${blocks}\n\n${TONE_SHARED_RULES}\n\n(Ces consignes de ton s’appliquent uniquement aux emails professionnels/personnels qui reçoivent une vraie réponse — pas aux cas scam/newsletter ci-dessous, qui ont leur propre format fixe.)`
}

// Prompt système — CONDENSÉ, et ça n'est pas cosmétique.
//
// DEUX limites Groq, et c'est la seconde qui mord en pratique (message
// d'erreur relevé en conditions réelles sur ce projet) :
//   « on tokens per day (TPD): Limit 200000, Used 195614, Requested 4587 »
// Le palier gratuit plafonne donc à 200 000 tokens PAR JOUR, en plus de la
// limite par minute. Les deux comptent le prompt + les emails + les
// max_tokens RÉSERVÉS (pas les tokens réellement produits).
//
// Une version antérieure de ce prompt pesait ~4900 tokens à elle seule : une
// requête de 3 emails en demandait ~8800, soit ~2900 par email — à peine
// 68 emails analysables dans une journée. L'analyse s'arrêtait donc au milieu
// d'une synchro, les lots suivants revenant en 429, et les emails restaient
// "pending". Mesuré après condensation : 4587 tokens pour 3 emails, soit
// ~1530 par email et environ 130 emails par jour.
//
// Règle à tenir : TOUTE règle de classement est conservée, c'est la PROSE qui
// est coupée. Les justifications ("pourquoi cette règle existe") vivent dans
// les commentaires du code, pas dans le prompt — le modèle n'en a pas besoin,
// et elles coûtent le même prix que les règles elles-mêmes.
// Mesurer après chaque modification : voir le commentaire de MAX_TOKENS_PER_EMAIL.
function buildSystemPrompt(toneSection: string): string {
  return `Tu analyses des emails pour un professionnel. Un mauvais classement coûte cher : rater une urgence, ou noyer l’utilisateur sous de fausses urgences.

## LANGUE
dailySummary et keyPoints : TOUJOURS en français. aiReply : dans la langue indiquée par "Langue de réponse demandée" de CET email.

## NE JAMAIS INVENTER
Priorité, résumé, date, montant, nom : tout doit venir d’un élément présent dans l’email. Info manquante → formule sans elle. Une donnée inventée est pire qu’une absence.

## ÉTAPE 1 — FILTRE AUTOMATISÉ, avant tout jugement de contenu
UN SEUL de ces signaux suffit → priority="normal", SANS EXCEPTION, même avec argent, délai, menace ou le mot "urgent" :
désabonnement ou "gérer mes préférences" · "généré automatiquement" / "ne pas répondre" · expéditeur no-reply@ newsletter@ marketing@ notifications@ promo@ · pied de page CGU + tracking (utm_, mc_eid) · contenu = offre, réduction, code promo, vente flash, lancement produit.
Le ton marketing (emojis, "dernières heures", "urgent") ne fait JAMAIS monter la priorité. Choisis le type à l’étape 3, puis passe au JSON.

## ÉTAPE 2 — PRIORITÉ, sur signaux concrets uniquement, jamais une impression

"urgent" — au moins UN signal concret :
échéance légale aujourd’hui ou demain · convocation, mise en demeure, assignation · impayé avec menace (pénalité, service coupé, compte bloqué) · rdv dans les heures qui suivent à préparer ou confirmer · blocage explicite avec coût énoncé, ou client menaçant de partir · compte compromis, panne en cours · signature requise avant ce soir · urgence sectorielle (médical, accident, sinistre à déclarer sous 48 h, visa, URSSAF/fisc, licenciement) · urgence personnelle réelle (santé, famille).

"important" — aucun signal urgent, mais :
demande, question ou retour d’un client, partenaire ou collègue sans délai · devis, contrat, facture, relance standard · rdv à planifier, livrable à relire · renouvellement à venir · candidature, partenariat, networking · config d’outil, document admin · notification bancaire à vérifier.

"normal" — tout le reste, et tout ce que l’étape 1 a attrapé.

PIÈGES, jamais "urgent" : le mot "urgent"/"ASAP"/"critique" sans rien de concret derrière · offre à durée limitée · ton pressant seul · "quand tu peux", "pas de rush".
EN CAS D’HÉSITATION, DESCENDS D’UN CRAN (urgent→important→normal), jamais l’inverse. Ne classe "urgent" que si tu peux citer le signal précis qui le justifie.

## ÉTAPE 3 — TYPE, par élimination dans CET ordre
Le PREMIER cas qui s’applique gagne ; ne redescends jamais. Type et priorité sont indépendants (un email peut être "invoice" ET "normal").
1 "spam" phishing, usurpation, arnaque
2 "promo" offre commerciale, réduction, vente, lancement produit
3 "newsletter" contenu périodique adressé à une liste
4 "notification" automatique d’un service : code 2FA, alerte connexion, reçu, accusé, statut de commande ou livraison
5 "invoice" facture, devis à régler, relevé, relance de paiement, remboursement — même venant d’un client
6 "meeting" propose, invite ou confirme un rdv à une date identifiable
7 "change" déplace, annule ou modifie un rdv déjà prévu
8 "deadline" échéance datée sans rdv : dépôt, délai légal, expiration, renouvellement
9 "client_request" demande, question ou retour d’un client ou prospect
10 "job" candidature, mission, partenariat, prospection entrante
11 "task" on demande d’agir, et l’expéditeur n’est PAS un client (collègue, prestataire, administration)
12 "confirmation" confirme du déjà acté, rien à faire
13 "info" tout le reste

Départages : facture envoyée par un client → 5 avant 9 · client demandant un rdv → 6 avant 9 · réunion annulée ou décalée → 7, jamais 6 · "votre commande est expédiée" → 4 avant 12 · même demande, d’un collègue → 11, d’un client → 9.
REÇU DE PAIEMENT DÉJÀ ENCAISSÉ (abonnement prélevé, "votre reçu", "paiement confirmé") → 4, JAMAIS 5 : l’argent est déjà parti, il n’y a rien à régler. Le 5 ne vaut que pour une somme RESTANT DUE.

## ÉVÉNEMENT
type "meeting" ou "change" → hasEvent OBLIGATOIREMENT true, avec eventTitle, eventDate et eventStartTime remplis (eventEndTime si déductible).

## ACTION À FAIRE — hasActionItem
Indépendant de hasEvent : un email peut avoir l’un, l’autre, les deux, aucun. Jamais pour la MÊME demande que hasEvent. Si false, laisse actionTitle, actionPriority, actionCategory et actionDueDate à null.
UNE SEULE tâche par email : celle qui bloque les autres, sinon celle dont l’échéance est la plus proche. Le reste va dans keyPoints.
- actionTitle : VERBE À L’INFINITIF + objet précis + interlocuteur si connu, 3 à 8 mots, compréhensible seul une semaine plus tard sans rouvrir l’email.
  BON : "Envoyer le devis chantier à Marine Lecomte" · "Régler la facture n°2291 (540 €)"
  INTERDIT : "Traiter l’email", "Répondre", "Suivi", "Action requise", "Voir le message".
- actionPriority : "urgent" (aujourd’hui, ou quelqu’un est bloqué en attendant) · "high" (cette semaine ; client, argent, engagement pris) · "medium" (demande normale sans date) · "low" (accessoire).
- actionCategory : EXACTEMENT une de ces neuf valeurs, jamais une autre chaîne — Client · Finance · Administratif · Rendez-vous · Opportunités · Équipe · Marketing · Personnel · Autre.
- actionDueDate : YYYY-MM-DD si une échéance est mentionnée même vaguement ("avant vendredi"), sinon null. N’invente jamais de date.

JAMAIS de tâche pour : code 2FA ou lien de réinitialisation (expire en minutes, type "notification") · sollicitation marketing à l’impératif, "commencez le sondage" (type "promo") · action que l’EXPÉDITEUR annonce faire lui-même · action déjà accomplie · "tenez-moi au courant" sans objet concret · action conditionnelle dont la condition n’est pas remplie.

## DATES RELATIVES
Référence = la date de réception de CET email ("Reçu le"), jamais la date du jour. "demain", "vendredi" → vraie date calendaire YYYY-MM-DD. eventStartTime en HH:MM sur 24 h ("09:00", pas "9:00"). Date de réunion donnée sans heure → hasEvent=true, eventStartTime=null.

## dailySummary
Une phrase, 3e personne, concrète et spécifique au contenu réel. Ex. : "Une facture de 340 € est à régler avant le 15." · "Un message suspect prétendant venir de votre banque a été reçu."

## keyPoints
2 à 4 points de 3 à 6 mots quand l’email liste plusieurs éléments concrets. Sinon [].

## aiReply — TU ES L’UTILISATEUR
Tu rédiges à sa place, à la première personne, prêt à envoyer tel quel. INTERDIT : "Vous pourriez répondre", parler de l’expéditeur à la 3e personne, toute note entre parenthèses. Prends de vraies décisions (accepter, refuser, proposer une alternative) au lieu de rester vague. Couvre TOUS les points soulevés, pas seulement le premier.
- Professionnel : Bonjour/Cordialement, précis, longueur adaptée à la demande.
- Famille ou ami : chaleureux, direct, sans formules.
- spam : "[élément précis détecté] — ceci ressemble à une tentative de phishing. Ne cliquez sur aucun lien et ne répondez pas."
- newsletter, promo, notification : "[résumé concret du contenu]. Aucune réponse nécessaire."

Chaque email indique "Ton demandé: X" — applique EXACTEMENT ce ton pour CET email ; deux emails du même lot peuvent en demander des différents.

${toneSection}

## EXEMPLES
"URGENT : -50 %, finit ce soir. Se désabonner." → normal / promo (étape 1 prime, "URGENT" ne compte pas).
"Serveur de production down, les clients ne peuvent plus se connecter." → urgent / task.
"Voici ma facture de 1 200 € à régler sous 15 jours.", d’un client → important / invoice (5 avant 9), actionCategory "Finance".
"Je dois décaler notre point de jeudi à vendredi 10h." → change, hasEvent=true, hasActionItem=false.
"Je vous envoie le dossier demain matin." → info, hasActionItem=false (c’est l’expéditeur qui agit).

## SORTIE — un JSON valide, et rien d’autre
{"results":[{"index":0,"priority":"urgent","type":"meeting","dailySummary":"...","keyPoints":["Bilan du projet"],"hasEvent":true,"eventTitle":"Réunion avec M. Lavoisier","eventDate":"2026-09-06","eventStartTime":"15:00","eventEndTime":null,"hasActionItem":true,"actionTitle":"Préparer le bilan trimestriel pour M. Lavoisier","actionPriority":"high","actionCategory":"Client","actionDueDate":"2026-09-05","aiReply":"..."}]}`
}

// --- Budget de tokens par requête ------------------------------------------
// Groq compte les max_tokens RÉSERVÉS dans ses limites, pas les tokens
// réellement produits — d'où l'intérêt de dimensionner selon la taille du lot
// plutôt que de réserver un forfait.
//
// ⚠️ PIÈGE : max_tokens ne borne PAS que le JSON visible. Sur gpt-oss, les
// tokens de RAISONNEMENT (reasoning_effort ci-dessous) sont comptés dedans,
// et ils sont invisibles dans la réponse. Une première version de ce calcul
// avait estimé la sortie à ~300 tokens par email en ne regardant que le JSON
// produit : le modèle épuisait alors son budget à raisonner avant d'avoir
// terminé le document, et Groq renvoyait
//   json_validate_failed — "max completion tokens reached before generating
//   a valid document"
// soit un appel entier perdu, prompt compris. Une réservation trop large ne
// coûte que de la marge ; une réservation trop courte coûte tout l'appel.
//
// Les valeurs ci-dessous reproduisent exactement le calibrage d'origine
// (2200 pour 3 emails, 1200 pour 1 — soit 700 + 500n), avec 100 tokens de
// marge en plus. Ne pas les baisser sans vérifier sur de vrais emails que le
// JSON reste complet.
const MAX_TOKENS_PER_EMAIL = 500
const MAX_TOKENS_BASE = 800
function maxTokensFor(emailCount: number): number {
  return MAX_TOKENS_BASE + MAX_TOKENS_PER_EMAIL * Math.max(1, emailCount)
}

// 900 (et non 1500) caractères par email : la demande, la date et le montant
// se trouvent dans les premières lignes. Les 600 caractères suivants étaient
// surtout des signatures, des citations du fil et des pieds de page — ~160
// tokens par email dépensés pour du bruit.
const EMAIL_CHARS_FOR_ANALYSIS = 900
// Repli après un rate limit : encore plus court, on cherche à faire passer
// la requête, pas à être exhaustif.
const EMAIL_CHARS_FOR_RETRY = 600

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

// --- Repli sans IA (Groq indisponible) ---------------------------------------
// Ce repli CONTREDISAIT le prompt qu'il remplace. L'ancienne version montait
// en "urgent" dès qu'un mot de la liste apparaissait — dont « avant », un des
// mots les plus courants du français, et « urgent », que le prompt dit
// explicitement d'ignorer quand rien de concret ne le soutient. Une pub
// « URGENT : offre valable avant ce soir » ressortait donc en urgence
// absolue, exactement le cas que l'Étape 1 du prompt existe pour écarter.
// Cette version applique le même ordre de décision que le prompt : filtre
// automatisé d'abord, puis signal CONCRET exigé, jamais un mot seul.

// Signaux d'email automatisé/commercial — Étape 1 du prompt système.
const AUTOMATED_PATTERNS = [
  /se\s+d[ée]sabonner|unsubscribe|g[ée]rer\s+(mes|vos)\s+pr[ée]f[ée]rences/i,
  /ne\s+pas\s+r[ée]pondre\s+[àa]\s+cet\s+email|g[ée]n[ée]r[ée]\s+automatiquement|generated\s+automatically/i,
  /code\s+(de\s+)?(v[ée]rification|confirmation)|verification\s+code|mot\s+de\s+passe\s+oubli[ée]/i,
]
const AUTOMATED_SENDER = /^(no-?reply|newsletter|marketing|notifications?|promo|info|news|mailer|bounce|do-?not-?reply)@/i
const PROMO_PATTERNS = /(-\s?\d{1,2}\s?%|\b\d{1,2}\s?%\s+de\s+r[ée]duction|code\s+promo|vente\s+flash|offre\s+limit[ée]e|soldes|black\s+friday)/i

function isAutomatedOrPromo(subject: string, body: string, senderEmail: string): boolean {
  const text = `${subject} ${body}`
  if (AUTOMATED_SENDER.test(senderEmail || '')) return true
  if (PROMO_PATTERNS.test(text)) return true
  return AUTOMATED_PATTERNS.some(p => p.test(text))
}

// Un signal « urgent » doit être CONCRET : une échéance datée proche, un
// blocage en cours, une menace de pénalité. Pas un adjectif.
const URGENT_SIGNALS = [
  /mise\s+en\s+demeure|assignation|convocation|huissier/i,
  /(p[ée]nalit[ée]s?|majoration|suspension|interruption)\s+(de\s+service|du\s+compte|appliqu)/i,
  /compte\s+(bloqu|suspendu|compromis)/i,
  /(panne|incident|indisponibilit[ée])\s+(en\s+cours|critique|de\s+production)/i,
  /(avant|d'?ici|au\s+plus\s+tard)\s+(ce\s+soir|aujourd'?hui|demain|\d{1,2}\s?h)/i,
  /sous\s+(24|48)\s*h/i,
]

// « important » : un enjeu réel est nommé, pas juste un mot de vocabulaire
// professionnel. On exige le mot ET un contexte (montant, référence, demande).
const IMPORTANT_SIGNALS = [
  /\bfacture\b|\bdevis\b|\bcontrat\b|\bavoir\b|\br[ée]glement\b/i,
  /\br[ée]union\b|\brendez-?vous\b|\bentretien\b|\bvisio\b/i,
  /\b\d[\d\s.,]*\s?(€|eur|euros)\b/i,
  /pouvez-vous|pourriez-vous|merci\s+de\s+(bien\s+vouloir|nous|me)|j'?attends\s+votre/i,
  /[ée]ch[ée]ance|renouvellement|r[ée]siliation|pr[ée]avis/i,
]

function classifyByKeywords(subject: string, body: string, senderEmail: string): 'urgent' | 'important' | 'normal' {
  // Étape 1 du prompt : l'automatisé/commercial est « normal », sans exception
  // — y compris quand il crie « URGENT ».
  if (isAutomatedOrPromo(subject, body, senderEmail)) return 'normal'

  const text = `${subject} ${body}`
  if (URGENT_SIGNALS.some(p => p.test(text))) return 'urgent'
  if (IMPORTANT_SIGNALS.some(p => p.test(text))) return 'important'
  return 'normal'
}

// Même resserrement : exige une vraie formulation de rendez-vous, pas le
// simple mot « appel » ou « invitation » qui apparaît dans n'importe quelle
// newsletter (« appel à candidatures », « invitation à découvrir »).
const EVENT_SIGNALS = [
  /\b(r[ée]union|rendez-?vous|entretien|visio|conf[ée]rence\s+call)\b/i,
  /\b(le|ce|mardi|mercredi|jeudi|vendredi|lundi|samedi|dimanche)\s+\d{0,2}\s*\w*\s+[àa]\s+\d{1,2}\s?h/i,
  /\bdisponible\s+(le|ce|lundi|mardi|mercredi|jeudi|vendredi)/i,
]

function detectEvent(subject: string, body: string, senderEmail: string) {
  if (isAutomatedOrPromo(subject, body, senderEmail)) return false
  const text = `${subject} ${body}`
  return EVENT_SIGNALS.some(p => p.test(text))
}

// Type d'email en mode dégradé — volontairement grossier mais JAMAIS faux :
// seulement ce qu'une regex peut établir sans ambiguïté. Tout le reste tombe
// sur "info", qui n'enclenche aucune automatisation.
function classifyTypeByKeywords(subject: string, body: string, senderEmail: string, hasEvent: boolean): string {
  if (isAutomatedOrPromo(subject, body, senderEmail)) {
    return PROMO_PATTERNS.test(`${subject} ${body}`) ? 'promo' : 'notification'
  }
  if (/\bfacture\b|\bdevis\b|\bimpay[ée]\b|invoice/i.test(`${subject} ${body}`)) return 'invoice'
  if (hasEvent) return 'meeting'
  return 'info'
}

function buildFallback(emails: any[]) {
  return emails.map((e: any, i: number) => {
    const body = e.body || e.preview || ''
    const sender = e.senderEmail || ''
    const hasEvent = detectEvent(e.subject, body, sender)
    return {
      index: i,
      priority: classifyByKeywords(e.subject, body, sender),
      type: classifyTypeByKeywords(e.subject, body, sender, hasEvent),
      hasEvent,
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
      actionCategory: null,
      actionDueDate: null,
      aiReply: `Bonjour,\n\nMerci pour votre message concernant "${e.subject}".\n\nJe reviens vers vous rapidement.\n\nCordialement`,
    }
  })
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

// Types qui ne donnent JAMAIS lieu à une vraie réponse : le brouillon produit
// pour eux dit en substance « Aucune réponse nécessaire » (voir le prompt).
//
// BUG CORRIGÉ ICI : le compteur mensuel s'incrémentait du NOMBRE D'EMAILS
// ANALYSÉS, alors que le forfait annonce « 50 réponses IA par mois » (voir
// lib/plans.tsx et la page Tarifs). Dans une boîte ordinaire, la majorité du
// volume est faite de pubs, newsletters et notifications automatiques : le
// quota partait donc presque entièrement sur des emails auxquels personne ne
// répond. Cas réel relevé sur ce compte : 51/50 consommés, dont des
// notifications Google, un code 2FA Instagram et une promo ChatGPT.
//
// Le tri, les résumés et la détection de tâches restent gratuits pour ces
// types — c'est bien ce que la page Tarifs promet.
const NO_REPLY_EMAIL_TYPES = new Set(['spam', 'promo', 'newsletter', 'notification'])

function countBillableReplies(results: unknown, fallbackCount: number): number {
  if (!Array.isArray(results)) return fallbackCount
  return results.filter(r => {
    const type = r && typeof r === 'object' ? (r as { type?: string }).type : undefined
    // Type absent (modèle qui l'oublie) : on compte, pour ne jamais rendre la
    // limite contournable par une sortie malformée.
    return !type || !NO_REPLY_EMAIL_TYPES.has(type)
  }).length
}

function enforceInformationalNoAction(result: any) {
  if (!result || typeof result !== 'object') return result
  if (!NO_ACTION_EMAIL_TYPES.has(result.type)) return result

  result.hasActionItem = false
  result.actionTitle = null
  result.actionPriority = null
  result.actionCategory = null
  result.actionDueDate = null
  result.hasEvent = false
  result.eventTitle = null
  result.eventDate = null
  result.eventStartTime = null
  result.eventEndTime = null
  return result
}

// Filet de sécurité sur la QUALITÉ du titre de tâche. Le prompt interdit les
// titres génériques, mais une consigne de rédaction est le genre de règle
// qu'un modèle relâche en premier quand l'email est pauvre en contenu. Une
// tâche intitulée « Répondre » ou « Suivi » oblige à rouvrir l'email pour
// savoir de quoi il s'agit : elle coûte plus de temps qu'elle n'en fait
// gagner. Mieux vaut aucune tâche qu'une tâche illisible.
const GENERIC_TITLE = /^(r[ée]pondre|traiter|suivi|action\s+requise|voir\s+(le\s+)?(message|mail|email)|[àa]\s+traiter|lire|v[ée]rifier|faire\s+le\s+suivi|relancer|prendre\s+connaissance)\.?$/i

function enforceActionQuality(result: any) {
  if (!result || typeof result !== 'object' || !result.hasActionItem) return result

  const title = typeof result.actionTitle === 'string' ? result.actionTitle.trim() : ''
  // < 3 mots : aucun titre utile ne tient en deux mots une fois le verbe posé.
  const tooShort = title.split(/\s+/).filter(Boolean).length < 3

  if (!title || tooShort || GENERIC_TITLE.test(title)) {
    result.hasActionItem = false
    result.actionTitle = null
    result.actionPriority = null
    result.actionCategory = null
    result.actionDueDate = null
    return result
  }

  result.actionTitle = title
  return result
}

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

  // Le plafond du JOUR, pas celui du mois. Les 50 réponses se consommaient
  // d'un bloc : sur une boîte active, c'était fait vers le 5e jour, et les 25
  // suivants l'IA se taisait complètement. Le total ne change pas, seule la
  // distribution — voir plafondQuotidien.
  const plafondDuJour = monthlyLimit === null ? null : plafondQuotidien(monthlyLimit, today)

  if (plafondDuJour !== null && currentCount >= plafondDuJour) {
    // Plafond atteint : on garde un classement basique par mots-clés (gratuit,
    // pas d'appel Groq) plutôt que de bloquer complètement l'utilisateur.
    // degraded : ces résultats viennent du repli par mots-clés, pas de l'IA.
    // Sans ce marqueur, /api/emails les enregistrait comme une vraie analyse
    // et les emails concernés n'étaient PLUS JAMAIS réanalysés — figés avec
    // un résumé vide, même une fois le quota revenu.
    //
    // Les deux cas sont distingués, parce que l'utilisateur n'a pas la même
    // chose à faire : le mois épuisé demande de passer à Pro ou d'attendre le
    // mois suivant ; le plafond du jour se relève tout seul demain.
    const moisEpuise = currentCount >= (monthlyLimit as number)
    return NextResponse.json({
      results: buildFallback(filtered),
      limitReached: moisEpuise,
      dailyCapReached: !moisEpuise,
      current: currentCount,
      max: monthlyLimit,
      degraded: true,
    })
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
    const emailSummaries = buildEmailSummaries(limited, EMAIL_CHARS_FOR_ANALYSIS, resolveTone, resolveLanguage)
    const systemPrompt = buildSystemPrompt(buildToneSection(limited.map((e: any) => resolveTone(e))))

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      // Dimensionné sur la taille du lot, pas forfaitaire — voir maxTokensFor.
      max_tokens: maxTokensFor(limited.length),
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
      parsed.results = parsed.results.map(enforceEventConsistency).map(enforceInformationalNoAction).map(enforceActionQuality)
    }
    // Seules les vraies réponses sont décomptées — voir countBillableReplies.
    await incrementUsage(countBillableReplies(parsed.results, limited.length))
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
        const retrySummary = buildEmailSummaries(retryLimited, EMAIL_CHARS_FOR_RETRY, resolveTone, resolveLanguage)
        const retrySystemPrompt = buildSystemPrompt(buildToneSection(retryLimited.map((e: any) => resolveTone(e))))

        const retryCompletion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          max_tokens: maxTokensFor(retryLimited.length),
          temperature: 0.2,
          reasoning_effort: 'low',
          reasoning_format: 'hidden',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: retrySystemPrompt },
            { role: 'user', content: `Date actuelle (repère général uniquement — ne sert PAS de référence pour les dates relatives, l’email a sa propre date de réception indiquée) : ${todayLabel()}.\n\nAnalyse cet email en suivant strictement la méthode donnée :\n\n${retrySummary}` }
          ]
        })

        const retryContent = retryCompletion.choices[0].message.content || '{}'
        console.log('Groq réponse complète (retry):', retryContent)

        const retryParsed = JSON.parse(retryContent)
        if (Array.isArray(retryParsed.results)) {
          retryParsed.results = retryParsed.results.map(enforceEventConsistency).map(enforceInformationalNoAction).map(enforceActionQuality)
        }
        await incrementUsage(countBillableReplies(retryParsed.results, retryLimited.length))
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
    return NextResponse.json({ results: buildFallback(filtered), degraded: true })
  }
}

// Emballé par routeJson : un throw inattendu rend du JSON, jamais une
// réponse vide que res.json() ferait exploser côté client.
// Voir lib/api-handler.ts.
export const POST = routeJson(POSTInterne)
