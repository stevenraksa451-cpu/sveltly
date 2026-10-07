// app/api/regenerate-reply/route.ts
// Régénère la réponse IA d'UN SEUL email dans un ton explicite, sans jamais
// retoucher sa classification (priorité/type) ni relire les autres emails —
// contrairement à /api/analyze qui traite un lot complet.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { getPlan } from '@/lib/plans'
import { resolveMonthlyUsage } from '@/lib/ai-usage'
import { Tone, TONE_LABEL, TONE_INSTRUCTIONS, TONE_SHARED_RULES, resolveToneLabel, resolveReplyLanguage, replyLanguageInstruction } from '@/lib/tone'

// Extrait le délai d'attente d'un message d'erreur Groq de type "Please try
// again in 7m13.728s." ou "Please try again in 45.2s." — la partie minutes
// est optionnelle, les secondes peuvent avoir une décimale. Retourne null
// (jamais une exception) si le format a changé côté Groq — l'appelant doit
// alors se rabattre sur un message générique plutôt que planter.
function parseGroqRetryAfterSeconds(message: string): number | null {
  const match = message.match(/in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i)
  if (!match) return null
  const minutes = match[1] ? parseInt(match[1], 10) : 0
  const seconds = parseFloat(match[2])
  if (isNaN(minutes) || isNaN(seconds)) return null
  return Math.ceil(minutes * 60 + seconds)
}

const REGEN_SYSTEM_PROMPT = `Tu rédiges une réponse à un email à la place de l'utilisateur — tu ES l'utilisateur, tu écris à la première personne, prête à être envoyée telle quelle.

INTERDIT : "Vous pourriez répondre en disant...", "Voici une suggestion...", parler de l'email à la troisième personne. OBLIGATOIRE : écris directement le texte final, comme si tu prenais le clavier à la place de l'utilisateur, en prenant de vraies décisions (accepter/refuser/proposer une alternative) plutôt que de rester vague. Aucun commentaire, aucune note entre parenthèses — juste le texte, brut, prêt à partir.

Ne jamais inventer un fait absent de l'email (nom, montant, date, société) : appuie-toi uniquement sur ce que l'email contient réellement.

## LANGUE DE SORTIE
La langue de la réponse est indiquée par la ligne "Langue de réponse demandée: X" dans le message ci-dessous — applique-la exactement, indépendamment de la langue de l'email reçu.

## TON DE LA RÉPONSE — OBLIGATOIRE

**${TONE_LABEL.professional}**
${TONE_INSTRUCTIONS.professional}

**${TONE_LABEL.formal}**
${TONE_INSTRUCTIONS.formal}

**${TONE_LABEL.casual}**
${TONE_INSTRUCTIONS.casual}

${TONE_SHARED_RULES}

## FORMAT DE RÉPONSE
Retourne UNIQUEMENT un JSON valide : {"reply": "texte de la réponse ici"}`

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

  const { email, tone: requestedTone, language: requestedLanguage, rememberForContact } = await req.json()
  if (!email?.subject || !email?.senderEmail) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, ai_replies_count, ai_replies_reset_at, reply_tone, reply_language')
    .eq('id', userId)
    .single()

  const plan = getPlan(profile?.plan)
  const monthlyLimit = plan.limits.aiRepliesPerMonth
  const { today, currentCount } = resolveMonthlyUsage(profile)

  if (monthlyLimit !== null && currentCount >= monthlyLimit) {
    return NextResponse.json({
      error: 'Limite mensuelle de réponses IA atteinte pour le plan gratuit.',
      limitReached: true,
      current: currentCount,
      max: monthlyLimit,
    }, { status: 403 })
  }

  // Priorité de résolution du ton : explicite (envoyé par le sélecteur sur
  // l'email) > contact (surcharge mémorisée pour cet expéditeur) > profil.
  let tone: Tone
  if (requestedTone && ['professional', 'formal', 'casual'].includes(requestedTone)) {
    tone = requestedTone
  } else {
    const { data: contact } = await supabase
      .from('contacts')
      .select('reply_tone')
      .eq('user_id', userId)
      .eq('email', (email.senderEmail || '').toLowerCase())
      .maybeSingle()
    tone = resolveToneLabel(contact?.reply_tone ?? profile?.reply_tone)
  }

  // Priorité de résolution de la langue : explicite (sélecteur sur l'email,
  // ponctuel — jamais mémorisé) > réglage global du profil.
  const replyLanguage = requestedLanguage && ['fr', 'en', 'auto'].includes(requestedLanguage)
    ? requestedLanguage
    : resolveReplyLanguage(profile?.reply_language)

  const receivedLabel = email.receivedAt
    ? new Date(email.receivedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'inconnue'

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      max_tokens: 900,
      temperature: 0.3,
      reasoning_effort: 'medium',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REGEN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Ton demandé: ${TONE_LABEL[tone]}\nLangue de réponse demandée: ${replyLanguageInstruction(replyLanguage)}\nReçu le: ${receivedLabel}\nSujet: ${email.subject}\nDe: ${email.sender} <${email.senderEmail}>\nContenu: ${(email.body || email.preview || '').slice(0, 2000)}\n\nRédige la réponse dans le ton et la langue demandés.`
        }
      ]
    })

    const content = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)
    const reply = typeof parsed.reply === 'string' ? parsed.reply : ''

    // Best-effort : la régénération compte comme une réponse IA générée.
    // Incrément atomique côté base — voir /api/analyze pour le contexte de
    // la race condition que ça referme (deux appels concurrents pouvaient
    // s'écraser mutuellement avec un simple read-modify-write applicatif).
    try {
      await supabase.rpc('increment_ai_usage', { p_n: 1, p_today: today.toISOString().slice(0, 10) })
    } catch (err) {
      console.error('Erreur incrémentation ai_replies_count:', err)
    }

    if (rememberForContact) {
      try {
        await supabase.from('contacts').upsert({
          user_id: userId,
          email: (email.senderEmail || '').toLowerCase(),
          reply_tone: tone,
        }, { onConflict: 'user_id,email' })
      } catch (err) {
        console.error('Erreur mémorisation du ton pour ce contact:', err)
      }
    }

    return NextResponse.json({ reply, tone, language: replyLanguage })

  } catch (err: any) {
    console.error('❌ Régénération Groq échouée:', err?.message, err?.status)

    // groq-sdk imbrique le corps d'erreur réel sous err.error.error (voir
    // node_modules/groq-sdk/core/error.js) — err.message n'est qu'une chaîne
    // de repli "<status> <JSON stringifié>", pas la donnée structurée.
    const groqErrorCode = err?.error?.error?.code
    const groqErrorMessage: string = err?.error?.error?.message || err?.message || ''

    if (groqErrorCode === 'rate_limit_exceeded' || err?.status === 429) {
      return NextResponse.json({
        error: 'rate_limit',
        message: "Limite quotidienne de l'IA atteinte",
        retryAfterSeconds: parseGroqRetryAfterSeconds(groqErrorMessage),
      }, { status: 429 })
    }

    return NextResponse.json({ error: 'La régénération a échoué, réessayez.' }, { status: 502 })
  }
}
