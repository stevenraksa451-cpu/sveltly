// lib/tone.ts
// Source unique du ton des réponses IA — utilisée par le prompt de génération
// (app/api/analyze, app/api/regenerate-reply) ET par l'aperçu affiché dans
// Paramètres > Intelligence artificielle, pour que l'exemple montré à
// l'utilisateur corresponde exactement à ce que l'IA produit réellement.

export type Tone = 'professional' | 'formal' | 'casual'

export const TONES: Tone[] = ['professional', 'formal', 'casual']

export const TONE_LABEL: Record<Tone, string> = {
  professional: 'Professionnel',
  formal: 'Formel',
  casual: 'Décontracté',
}

// Consignes injectées dans le prompt système — une par ton, sélectionnée selon
// le ton résolu pour chaque email (voir resolveTone dans lib/ai-usage.ts).
export const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: `Registre neutre-professionnel : clair, courtois, direct — ni froid ni familier. Vouvoiement systématique. Ouverture sobre ("Bonjour [Prénom]," ou "Bonjour," si le prénom est inconnu). Clôture standard ("Cordialement," ou "Bien à vous,"). Phrases courtes à moyennes, une idée par phrase, pas de jargon inutile. Longueur : la plus courte possible qui couvre tous les points soulevés — aucun remplissage.`,
  formal: `Registre soutenu. Vouvoiement strict, aucune contraction ni familiarité. Formule de politesse complète en ouverture ("Madame, Monsieur," si le destinataire est inconnu, sinon "Madame [Nom]," / "Monsieur [Nom],") et en clôture ("Je vous prie d'agréer, [Madame/Monsieur], l'expression de mes salutations distinguées."). Phrases structurées et complètes, sans ellipse. Peut être un peu plus long que le ton professionnel si la structure formelle l'exige (un paragraphe distinct par sujet traité).`,
  casual: `Registre chaleureux et naturel, comme à un client que l'on connaît bien — jamais négligé pour autant. Tutoiement UNIQUEMENT si l'email reçu tutoie déjà l'utilisateur ; sinon vouvoiement, mais avec un ton plus détendu que le professionnel. Ouverture légère ("Salut [Prénom]," si tutoiement, "Bonjour [Prénom]," sinon). Clôture simple ("À bientôt," ou "Belle journée," — jamais "Cordialement" qui casse le ton). Phrases courtes, rythme naturel. Longueur : la plus courte possible.`,
}

// Règles communes à tous les tons — jamais spécifiques à un seul.
// La langue de sortie n'est PAS traitée ici : voir LANGUAGE_INSTRUCTION /
// REPLY_LANGUAGE_LABEL ci-dessous, et la règle "LANGUE DE SORTIE OBLIGATOIRE"
// en tête des prompts système (app/api/analyze, app/api/regenerate-reply).
export const TONE_SHARED_RULES = `RÈGLE DE FOND — LE TON NE CHANGE JAMAIS LE FOND : les informations transmises, les décisions prises et les engagements pris dans la réponse doivent être STRICTEMENT IDENTIQUES quel que soit le ton demandé. Seuls le registre, les formules de politesse, la longueur des phrases et le degré de familiarité changent selon le ton. N'ajoute et ne retire jamais une information à cause du ton.

RÈGLE DE REGISTRE : adapte le niveau de vouvoiement/tutoiement (ou son équivalent) au niveau de familiarité perçu dans l'email source, indépendamment de la langue dans laquelle tu rédiges ta sortie. Si cette langue de sortie ne distingue pas grammaticalement tu/vous (ex: l'anglais), rends le même niveau de familiarité par le choix des mots et des formules plutôt que par une marque grammaticale.`

// Langue de sortie de la réponse (aiReply) uniquement — jamais dailySummary
// ni keyPoints, qui restent toujours en français (ce sont des champs internes
// à l'interface de Sveltly, elle-même en français, indépendamment de ce
// réglage). "auto" fait correspondre la réponse à la langue de l'email reçu.
export type ReplyLanguage = 'fr' | 'en' | 'auto'

export const REPLY_LANGUAGES: ReplyLanguage[] = ['fr', 'en', 'auto']

export const REPLY_LANGUAGE_LABEL: Record<ReplyLanguage, string> = {
  fr: 'Français',
  en: 'Anglais',
  auto: 'Automatique',
}

export const REPLY_LANGUAGE_DESC: Record<ReplyLanguage, string> = {
  fr: 'Vos réponses sont toujours rédigées en français, quelle que soit la langue de l\'email reçu.',
  en: 'Vos réponses sont toujours rédigées en anglais, quelle que soit la langue de l\'email reçu.',
  auto: 'Vos réponses sont rédigées dans la même langue que l\'email reçu (détectée automatiquement).',
}

export function resolveReplyLanguage(lang: string | null | undefined): ReplyLanguage {
  return (REPLY_LANGUAGES as string[]).includes(lang || '') ? (lang as ReplyLanguage) : 'fr'
}

// Injectée par email (comme "Ton demandé:") — pilote UNIQUEMENT la langue de
// aiReply pour cet email précis.
export function replyLanguageInstruction(lang: ReplyLanguage): string {
  if (lang === 'en') return 'anglais — rédige aiReply en anglais quelle que soit la langue de cet email'
  if (lang === 'auto') return "la langue de cet email reçu (détecte-la toi-même) — rédige aiReply dans cette langue"
  return 'français — rédige aiReply en français quelle que soit la langue de cet email'
}

// Exemple affiché dans Paramètres > Intelligence artificielle, pour montrer la
// différence de ton avant de choisir — même situation (relance d'un devis)
// rédigée dans les 3 tons.
export const TONE_EXAMPLE: Record<Tone, string> = {
  professional: `Bonjour Marine,\n\nLe devis est validé de mon côté. Je vous transmets la version signée d'ici vendredi, comme convenu.\n\nCordialement,`,
  formal: `Bonjour Madame Lecomte,\n\nJe vous confirme la validation du devis transmis. Le document signé vous parviendra dans le délai imparti, avant vendredi.\n\nJe vous prie d'agréer, Madame, l'expression de mes salutations distinguées.`,
  casual: `Salut Marine,\n\nDevis validé de mon côté — je t'envoie la version signée avant vendredi comme prévu. Je te tiens au courant si besoin.\n\nÀ bientôt,`,
}

export function resolveToneLabel(tone: string | null | undefined): Tone {
  return (TONES as string[]).includes(tone || '') ? (tone as Tone) : 'professional'
}
