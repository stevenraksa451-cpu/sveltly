// types/index.ts
export type Priority = 'urgent' | 'important' | 'normal'

export interface DetectedEvent {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
}

/**
 * Un email, tel que l'application le manipule.
 *
 * Ce type était éclaté en QUATRE déclarations `export interface Email`
 * réparties dans le fichier, fusionnées en silence par TypeScript. Rien ne
 * cassait, mais le type était illisible : chaque bloc s'ouvrait sur
 * « ... champs existants » et il fallait les retrouver tous pour savoir ce
 * qu'un email contient. Une seule déclaration désormais, groupée par origine.
 */
export interface Email {
  // --- Message brut (Gmail) ---
  id: string
  threadId?: string
  subject: string
  sender: string
  senderEmail: string
  preview: string
  body: string
  bodyHtml?: string | null
  receivedAt: string
  isRead: boolean
  tags: string[]
  attachments?: EmailAttachment[]
  labelIds?: string[]

  // --- Produit par l'analyse IA (app/api/analyze) ---
  priority: Priority
  emailType?: EmailType
  dailySummary?: string
  keyPoints?: string[]
  hasAIReply?: boolean
  aiDraftReply?: string
  /**
   * 'pending' tant que Groq n'a pas encore produit d'analyse pour cet email
   * (voir app/api/emails/route.ts) — absent sur les emails jamais passés par
   * ce pipeline. Utilisé côté client pour accélérer le polling (voir
   * hooks/useEmails.ts) tant qu'il en reste.
   */
  analysisStatus?: 'pending' | 'done'

  // --- Rendez-vous détecté et planification (lib/scheduling.ts) ---
  calendarEventDetected?: boolean
  detectedEvent?: DetectedEvent | null
  autoScheduled?: boolean
  /**
   * 'clear' (planifié), un statut de conflit (voir lib/scheduling.ts), ou
   * 'plan_limit' — événement au-delà de 7 jours, planification auto réservée
   * au forfait Pro au-delà de cette fenêtre (voir app/api/emails/route.ts).
   */
  schedulingStatus?: string
  schedulingConflicts?: unknown[]
  schedulingAlternative?: { startTime: string; endTime: string } | null
  /**
   * Autres événements du jour que la planification automatique propose de
   * déplacer (moins prioritaires que celui détecté dans cet email). Jamais
   * appliqué tout seul : l'utilisateur confirme depuis le panneau email.
   */
  schedulingDisplaced?: unknown[]

  // --- Actions dérivées (app/api/emails/route.ts) ---
  actionItemDetected?: boolean
  detectedAction?: DetectedAction | null
  autoTaskCreated?: boolean
  autoArchived?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  date: string        // ISO date string
  startTime: string   // "09:00"
  endTime: string     // "10:00"
  description?: string
  fromEmailId?: string
  color?: string
  // Priorité affichée + utilisée par l'algorithme de réarrangement (voir
  // lib/scheduling.ts) — 'normal' si absent (anciens événements créés avant
  // cette colonne, ou valeur par défaut en base).
  priority?: Priority
  // 'google_import' : événement créé directement dans Google Calendar, importé
  // tel quel par Sveltly (voir app/api/calendar/import) — jamais déplacé
  // automatiquement. 'inflo' (défaut) : créé depuis Sveltly (manuellement ou
  // depuis un email), déplaçable par l'algorithme de réarrangement.
  origin?: 'inflo' | 'google_import'
  // A des invités (connu uniquement pour les événements importés depuis
  // Google — Sveltly n'ajoute jamais d'invités aux événements qu'il crée) —
  // un événement avec invités n'est jamais déplacé automatiquement.
  hasAttendees?: boolean
  // Verrouillage manuel par l'utilisateur — un événement verrouillé n'est
  // jamais déplacé par l'algorithme de réarrangement, quelle que soit sa
  // priorité ou son origine.
  locked?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  connectedMailboxes: Mailbox[]
  preferences: UserPreferences
}

export interface Mailbox {
  id: string
  provider: 'gmail' | 'outlook' | 'other'
  email: string
  label: string
  isConnected: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  replyTone: 'professional' | 'formal' | 'casual'
  notificationsEnabled: boolean
  language: string
}

export interface DashboardStats {
  totalEmails: number
  urgentCount: number
  importantCount: number
  normalCount: number
  aiRepliesGenerated: number
  eventsDetected: number
}

export type EmailType =
  | 'meeting' | 'deadline' | 'task' | 'client_request' | 'confirmation'
  | 'change' | 'invoice' | 'job' | 'info' | 'newsletter' | 'promo'
  | 'notification' | 'spam'

export interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
}

export interface DetectedAction {
  title?: string
  // 'urgent' inclus : la priorité finale de la tâche tient compte de celle de
  // l'EMAIL, pas seulement du jugement de l'IA sur l'action isolée (voir
  // resolveTaskPriority dans lib/tasks.ts).
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  // Valeur du jeu fermé TASK_CATEGORIES (lib/tasks.ts). Jamais du texte
  // libre, et jamais le nom de l'expéditeur — celui-ci vit dans la colonne
  // tasks.source_label.
  category?: string | null
  dueDate?: string | null
}

