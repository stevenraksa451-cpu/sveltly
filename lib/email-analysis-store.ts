// lib/email-analysis-store.ts
// Persistance du résultat d'analyse IA d'un email, pour ne jamais le refaire.
//
// POURQUOI CE FICHIER EXISTE
// lib/email-cache.ts est une Map en mémoire avec 5 minutes de durée de vie.
// Passé ce délai — ou au premier démarrage à froid d'une instance serverless,
// donc quasiment toujours en production — l'analyse était perdue et refaite
// auprès de Groq. Les mêmes emails repayaient leur analyse plusieurs fois par
// jour, ce qui épuisait le budget de 200 000 tokens quotidiens.
//
// Ce store ne remplace pas le cache mémoire : celui-ci sert à éviter un
// aller-retour Gmail complet, celui-là à éviter un aller-retour Groq. Le
// second est de loin le plus cher.

import type { Email } from '@/types'

// PostgREST passe les filtres .in() dans l'URL. Une synchro initiale peut
// porter sur 300 identifiants Gmail (~17 caractères chacun) : au-delà d'une
// centaine, l'URL dépasse les limites usuelles et la requête échoue en bloc.
// On interroge donc par tranches.
const ID_CHUNK = 100

export interface StoredAnalysis {
  email_id: string
  priority: string | null
  email_type: string | null
  daily_summary: string | null
  key_points: string[] | null
  ai_reply: string | null
  has_event: boolean | null
  event_title: string | null
  event_date: string | null
  event_start_time: string | null
  event_end_time: string | null
  has_action: boolean | null
  action_title: string | null
  action_priority: string | null
  action_category: string | null
  action_due_date: string | null
  reply_tone: string | null
  reply_language: string | null
}

// Code renvoyé tant que la migration 20261012000000_email_analyses.sql n'a pas
// été appliquée. Le store devient alors inerte : on perd l'économie de
// tokens, mais la synchro continue de fonctionner exactement comme avant.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && MISSING_TABLE_CODES.has(error.code)
}

/**
 * Analyses déjà connues pour ces emails, indexées par id.
 *
 * Une analyse produite avec un AUTRE ton ou une autre langue de réponse est
 * volontairement ignorée : son brouillon ne correspond plus au réglage
 * courant de l'utilisateur, il faut la refaire. Le classement, lui, serait
 * encore valable — mais séparer les deux compliquerait la lecture pour un
 * gain nul : changer de ton est rare.
 */
export async function loadAnalyses(
  supabase: { from: (t: string) => any },
  userId: string,
  emailIds: string[],
  currentTone: string,
  currentLanguage: string
): Promise<Map<string, StoredAnalysis>> {
  const byId = new Map<string, StoredAnalysis>()
  if (emailIds.length === 0) return byId

  for (let i = 0; i < emailIds.length; i += ID_CHUNK) {
    const chunk = emailIds.slice(i, i + ID_CHUNK)
    const { data, error } = await supabase
      .from('email_analyses')
      .select('*')
      .eq('user_id', userId)
      .in('email_id', chunk)

    if (error) {
      // Migration pas encore appliquée : on abandonne silencieusement le
      // store plutôt que de faire échouer la synchro entière.
      if (isMissingTable(error)) return new Map()
      console.error('❌ Lecture email_analyses:', error.message, error.code)
      continue
    }

    for (const row of (data || []) as StoredAnalysis[]) {
      if (row.reply_tone && row.reply_tone !== currentTone) continue
      if (row.reply_language && row.reply_language !== currentLanguage) continue
      byId.set(row.email_id, row)
    }
  }

  return byId
}

/** Applique une analyse stockée à un email, au même format que l'analyse fraîche. */
export function applyStoredAnalysis(email: any, row: StoredAnalysis): Email {
  return {
    ...email,
    analysisStatus: 'done',
    priority: (row.priority as Email['priority']) || 'normal',
    emailType: (row.email_type as Email['emailType']) || 'info',
    dailySummary: row.daily_summary || '',
    keyPoints: row.key_points || [],
    hasAIReply: true,
    aiDraftReply: row.ai_reply || '',
    calendarEventDetected: !!row.has_event,
    detectedEvent: row.has_event
      ? {
          title: row.event_title || undefined,
          date: row.event_date || undefined,
          startTime: row.event_start_time || undefined,
          endTime: row.event_end_time || undefined,
        }
      : null,
    actionItemDetected: !!row.has_action,
    detectedAction: row.has_action
      ? {
          title: row.action_title || undefined,
          priority: (row.action_priority as never) || undefined,
          category: row.action_category,
          dueDate: row.action_due_date,
        }
      : null,
  }
}

/**
 * Enregistre les analyses fraîchement produites.
 *
 * Best-effort : une écriture ratée ne doit jamais faire échouer la synchro.
 * Le pire cas est de repayer l'analyse à la prochaine passe, exactement le
 * comportement d'avant ce store.
 */
export async function saveAnalyses(
  supabase: { from: (t: string) => any },
  userId: string,
  analysisById: Map<string, any>,
  replyTone: string,
  replyLanguage: string
): Promise<number> {
  if (analysisById.size === 0) return 0

  const rows: Array<Record<string, unknown>> = []
  analysisById.forEach((a, emailId) => {
    rows.push({
      user_id: userId,
      email_id: emailId,
      priority: a.priority ?? null,
      email_type: a.type ?? null,
      daily_summary: a.dailySummary ?? null,
      key_points: a.keyPoints ?? [],
      ai_reply: a.aiReply ?? null,
      has_event: !!a.hasEvent,
      event_title: a.eventTitle ?? null,
      event_date: a.eventDate ?? null,
      event_start_time: a.eventStartTime ?? null,
      event_end_time: a.eventEndTime ?? null,
      has_action: !!a.hasActionItem,
      action_title: a.actionTitle ?? null,
      action_priority: a.actionPriority ?? null,
      action_category: a.actionCategory ?? null,
      action_due_date: a.actionDueDate ?? null,
      reply_tone: replyTone,
      reply_language: replyLanguage,
      analyzed_at: new Date().toISOString(),
    })
  })

  const { error } = await supabase
    .from('email_analyses')
    .upsert(rows, { onConflict: 'user_id,email_id' })

  if (error) {
    if (!isMissingTable(error)) {
      console.error('❌ Écriture email_analyses:', error.message, error.code)
    }
    return 0
  }
  return rows.length
}
