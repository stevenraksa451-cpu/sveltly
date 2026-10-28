// lib/tasks.ts
// Source unique de la logique de tâches : catégories, priorités, et la
// traduction d'un email analysé en tâche exploitable.
//
// POURQUOI CE FICHIER EXISTE
// La colonne `tasks.category` portait DEUX significations incompatibles :
//   - tâche créée à la main  → une vraie catégorie choisie dans une liste
//     ('Client', 'Marketing', 'Équipe', 'Finance', 'Personnel', 'Autre') ;
//   - tâche créée depuis un email → le NOM DE L'EXPÉDITEUR ('Google',
//     'Lydia from Claude Code', 'Anthropic Ireland, Limited').
// Le filtre latéral de /tasks se construisant à partir des valeurs réellement
// présentes, il listait donc des contacts au milieu des catégories, et
// filtrer par « Client » ne ramenait jamais une tâche venue d'un email.
//
// Désormais : `category` est TOUJOURS une valeur de TASK_CATEGORIES, et le
// nom de l'expéditeur vit dans sa propre colonne `source_label`
// (migration supabase/migrations/20261002000000_tasks_category_source.sql).

import type { EmailType, Priority } from '@/types'

// --- Catégories ---------------------------------------------------------

// Jeu FERMÉ. Les six premières existaient déjà (liste d'ajout manuel de
// /tasks) et sont conservées telles quelles pour ne pas orpheliner les
// tâches déjà classées ; les trois dernières sont ajoutées parce que les
// types d'emails les plus fréquents n'avaient nulle part où tomber
// (une facture atterrissait dans « Autre » comme un spam).
export const TASK_CATEGORIES = [
  'Client',
  'Finance',
  'Administratif',
  'Rendez-vous',
  'Opportunités',
  'Équipe',
  'Marketing',
  'Personnel',
  'Autre',
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

const CATEGORY_SET = new Set<string>(TASK_CATEGORIES)

export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === 'string' && CATEGORY_SET.has(value)
}

// Repli déterministe quand l'IA ne renvoie pas de catégorie valide. Dérivé du
// type d'email, qui est lui déjà contraint et vérifié — jamais du texte libre.
// Les types purement informatifs ne sont pas listés : ils ne produisent
// jamais de tâche (voir NO_TASK_EMAIL_TYPES dans app/api/emails/route.ts).
const CATEGORY_BY_EMAIL_TYPE: Partial<Record<EmailType, TaskCategory>> = {
  client_request: 'Client',
  invoice: 'Finance',
  deadline: 'Administratif',
  meeting: 'Rendez-vous',
  change: 'Rendez-vous',
  job: 'Opportunités',
  task: 'Client',
  info: 'Autre',
}

/**
 * Catégorie finale d'une tâche issue d'un email.
 * Priorité : valeur de l'IA si elle appartient au jeu fermé, sinon repli
 * déterministe par type d'email, sinon 'Autre'. Jamais de texte libre.
 */
export function resolveTaskCategory(
  aiCategory: unknown,
  emailType: EmailType | undefined
): TaskCategory {
  if (isTaskCategory(aiCategory)) return aiCategory
  if (emailType && CATEGORY_BY_EMAIL_TYPE[emailType]) return CATEGORY_BY_EMAIL_TYPE[emailType]!
  return 'Autre'
}

// --- Priorités ----------------------------------------------------------

// Même jeu que la contrainte CHECK de la table (supabase-schema.sql).
export const TASK_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
}

const PRIORITY_SET = new Set<string>(TASK_PRIORITIES)

/**
 * Priorité finale d'une tâche issue d'un email.
 *
 * BUG CORRIGÉ ICI : l'IA ne produisait que 'high' | 'medium' | 'low', et la
 * valeur était écrite telle quelle. La colonne accepte pourtant 'urgent', et
 * l'encart « Priorités » de /tasks affiche une ligne Urgent — qui restait
 * donc à zéro quoi qu'il arrive, y compris pour une tâche née d'un email
 * classé urgent. La priorité de l'EMAIL fait maintenant foi vers le haut :
 * un email urgent produit une tâche urgente, quel qu'ait été le jugement
 * séparé de l'IA sur l'action elle-même.
 */
export function resolveTaskPriority(
  aiPriority: unknown,
  emailPriority: Priority | undefined
): TaskPriority {
  if (emailPriority === 'urgent') return 'urgent'

  const fromAi = typeof aiPriority === 'string' && PRIORITY_SET.has(aiPriority)
    ? (aiPriority as TaskPriority)
    : null

  // Un email « important » ne descend jamais sous 'medium' : l'IA jugeait
  // parfois l'action secondaire ('low') sur un email par ailleurs important,
  // et la tâche se retrouvait tout en bas de liste.
  if (emailPriority === 'important') {
    if (fromAi === 'urgent' || fromAi === 'high') return fromAi
    return 'medium'
  }

  return fromAi ?? 'medium'
}

// --- Écriture tolérante au schéma ---------------------------------------

// Codes renvoyés tant que la migration ajoutant source_label
// (supabase/migrations/20261002000000_tasks_category_source.sql) n'a pas été
// appliquée : 42703 côté Postgres, PGRST204 côté PostgREST quand la colonne
// est absente du cache de schéma. Même garde que toggleTaskCompletion pour
// completed_at (hooks/useTasks.ts).
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204'])

function isMissingColumn(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_COLUMN_CODES.has(error.code)
}

export interface NewTaskRow {
  user_id: string
  title: string
  priority: TaskPriority
  category: TaskCategory
  due_date: string | null
  completed: boolean
  source_label: string | null
  from_email_id: string | null
}

/**
 * Insère une tâche sans jamais écraser une tâche existante pour le même
 * email, et en survivant à une base où la migration source_label n'est pas
 * encore passée.
 *
 * `ignoreDuplicates` est essentiel : la clé unique (user_id, from_email_id)
 * fait qu'un email déjà traité retombe en conflit. Avec un upsert classique,
 * ce conflit RÉÉCRIVAIT la ligne — ce qui décochait une tâche déjà terminée
 * et effaçait les modifications manuelles de l'utilisateur, à chaque
 * ré-analyse du même email.
 */
export async function insertTaskSafely(
  supabase: { from: (t: string) => any },
  row: NewTaskRow
): Promise<{ error: { message?: string; code?: string } | null; degraded: boolean }> {
  const opts = { onConflict: 'user_id,from_email_id', ignoreDuplicates: true }

  const { error } = await supabase.from('tasks').upsert(row, opts)
  if (!isMissingColumn(error)) return { error, degraded: false }

  // Repli : même écriture sans la colonne manquante. La provenance est perdue
  // pour cette tâche, mais la tâche elle-même est créée — très préférable à
  // une création qui échoue en silence.
  const { source_label: _dropped, ...withoutSource } = row
  const { error: retryError } = await supabase.from('tasks').upsert(withoutSource, opts)
  return { error: retryError, degraded: true }
}

// --- Échéances ----------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Valide une échéance produite par l'IA.
 *
 * Rejette ce qui n'est pas une date ISO réelle (l'IA renvoyait parfois
 * « demain » ou « 2026-02-31» en texte), et surtout toute date dans le passé :
 * une tâche créée aujourd'hui avec une échéance d'il y a trois semaines
 * atterrissait directement dans « En retard » alors qu'elle venait de naître.
 * Ça arrive quand l'IA calcule l'échéance depuis la date de RÉCEPTION d'un
 * vieil email — correct dans l'absolu, trompeur dans une liste de tâches.
 */
export function resolveTaskDueDate(value: unknown, today: string): string | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null

  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  // Rejette les dates syntaxiquement valides mais inexistantes (31 février) :
  // Date les décale silencieusement au mois suivant.
  if (parsed.toISOString().slice(0, 10) !== value) return null

  return value < today ? null : value
}
