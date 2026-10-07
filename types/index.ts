// types/index.ts
export type Priority = 'urgent' | 'important' | 'normal'

export interface DetectedEvent {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
}

export interface Email {
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
  priority: Priority
  tags: string[]
  hasAIReply?: boolean
  aiDraftReply?: string
  calendarEventDetected?: boolean
  detectedEvent?: DetectedEvent | null
  autoScheduled?: boolean
  // 'clear' (planifié), un statut de conflit (voir lib/scheduling.ts), ou
  // 'plan_limit' — événement au-delà de 7 jours, planification auto réservée
  // au forfait Pro au-delà de cette fenêtre (voir app/api/emails/route.ts).
  schedulingStatus?: string
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

export interface Email {
  // ... champs existants
  emailType?: EmailType
  dailySummary?: string
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
}

export interface Email {
  // ... champs existants
  keyPoints?: string[]
  attachments?: EmailAttachment[]
  labelIds?: string[]
}

export interface DetectedAction {
  title?: string
  priority?: 'high' | 'medium' | 'low'
  dueDate?: string | null
}

// Champs produits par app/api/emails/route.ts (détection d'action sans
// créneau, résultat de la planification automatique) — jusqu'ici absents de
// ce type malgré un usage réel côté app/composants, qui s'appuyait donc sur
// `any` ou des assertions non vérifiées pour y accéder.
export interface Email {
  // ... champs existants
  actionItemDetected?: boolean
  detectedAction?: DetectedAction | null
  schedulingConflicts?: unknown[]
  schedulingAlternative?: { startTime: string; endTime: string } | null
  // Autres événements du jour que la planification automatique propose de
  // déplacer (moins prioritaires que celui détecté dans cet email) — voir
  // resolveScheduling dans lib/scheduling.ts. Jamais appliqué tout seul :
  // l'utilisateur doit confirmer depuis le panneau email (bouton "Réorganiser").
  schedulingDisplaced?: unknown[]
  autoTaskCreated?: boolean
  autoArchived?: boolean
}