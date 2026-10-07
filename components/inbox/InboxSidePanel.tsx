'use client'
import { useEffect, useRef, useState } from 'react'
import { Email } from '@/types'
import { supabase } from '@/lib/supabase'
import PriorityBadge from '@/components/ui/PriorityBadge'
import ConflictPlanCard from '@/components/calendar/ConflictPlanCard'
import styles from './InboxSidePanel.module.css'

// La plupart des pièces jointes (images, PDF courts) pèsent quelques
// centaines de Ko — toujours afficher en Mo les arrondissait systématiquement
// à "0.0 MB", pas vraiment informatif.
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

type SchedulingState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'created' }
  | { step: 'conflict'; data: any }
  | { step: 'error'; message: string }

export default function InboxSidePanel({ email, onArchive, onToggleRead, loading, onAnalyzed }: {
  email: Email
  onArchive: () => void
  onToggleRead: () => void
  loading: boolean
  // Optionnel : permet au parent de fusionner le résultat dans son propre
  // état (cache SWR de la liste) — sans lui, cette carte fonctionne quand
  // même seule (elle a son propre état local), mais un résumé demandé ici
  // ne serait pas visible ailleurs (ex: si l'utilisateur revient sur cet
  // email plus tard dans la même session).
  onAnalyzed?: (emailId: string, analysis: any) => void
}) {
  const [taskAdded, setTaskAdded] = useState(false)
  const [schedulingState, setSchedulingState] = useState<SchedulingState>({ step: 'idle' })

  // Résumé manquant (email pas encore passé par l'analyse IA lors de la
  // dernière synchro — voir /api/emails) : on le demande nous-mêmes à
  // l'ouverture, sans toucher à l'architecture de synchro existante — un
  // simple appel à /api/analyze, le même endpoint déjà utilisé côté serveur,
  // pour CET email précis.
  //
  // Le résultat est gardé à part (pas fusionné dans une copie figée de
  // `email`) et superposé à `email` à chaque rendu, via `display` plus bas —
  // si `email` change entre-temps pour une tout autre raison (marqué
  // lu/archivé, par ex.), ça reste à jour au lieu de rester bloqué sur l'état
  // du moment où l'analyse a été lancée.
  const [analyzedFields, setAnalyzedFields] = useState<Partial<Email> | null>(null)
  const [summaryError, setSummaryError] = useState(false)
  const analyzedRef = useRef(false)

  useEffect(() => {
    if (email.dailySummary || analyzedRef.current) return
    analyzedRef.current = true

    async function analyzeNow() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ emails: [email] }),
        })
        const parsed = await res.json()
        const analysis = parsed.results?.[0]
        if (!analysis || parsed.groqError) { setSummaryError(true); return }

        const enriched: Partial<Email> = {
          priority: analysis.priority || email.priority,
          emailType: analysis.type || email.emailType,
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
        }
        setAnalyzedFields(enriched)
        onAnalyzed?.(email.id, enriched)
      } catch {
        setSummaryError(true)
      }
    }

    analyzeNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toujours dérivé du prop `email` le plus récent + l'enrichissement local
  // s'il existe — jamais une copie figée.
  const display: Email = analyzedFields ? { ...email, ...analyzedFields } : email
  const isArchived = email.labelIds?.includes('INBOX') === false

  async function handleAddTask() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    await supabase.from('tasks').insert({
      user_id: user.id,
      title: email.subject,
      category: email.sender,
    })
    setTaskAdded(true)
    setTimeout(() => setTaskAdded(false), 2000)
  }

  async function handleScheduleEvent(forceSlot?: { startTime: string; endTime: string }) {
    setSchedulingState({ step: 'loading' })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSchedulingState({ step: 'error', message: 'Non authentifié' }); return }

    const res = await fetch('/api/calendar/schedule-from-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        title: display.detectedEvent?.title,
        date: display.detectedEvent?.date,
        startTime: display.detectedEvent?.startTime,
        endTime: display.detectedEvent?.endTime,
        sourceSubject: email.subject,
        sourceEmailId: email.id,
        // Hérité de l'email déjà classé par Groq — pilote directement
        // l'algorithme de réarrangement (voir lib/scheduling.ts) : un
        // événement détecté dans un email urgent passe avant un événement
        // normal déjà planifié.
        priority: display.priority,
        forceSlot,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setSchedulingState({ step: 'error', message: json.error || 'Erreur inconnue' })
      return
    }
    if (json.status === 'created') {
      setSchedulingState({ step: 'created' })
      return
    }
    setSchedulingState({ step: 'conflict', data: json })
  }

  // "Réorganiser ma journée" depuis la carte de conflit : applique le plan
  // déjà calculé par le serveur (voir /api/calendar/apply-arrangement) —
  // déplace les événements moins prioritaires listés dans `displaced`, puis
  // insère l'événement détecté dans cet email à son horaire d'origine.
  async function handleReorganizeFromConflict() {
    if (schedulingState.step !== 'conflict') return
    const { data } = schedulingState
    setSchedulingState({ step: 'loading' })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSchedulingState({ step: 'error', message: 'Non authentifié' }); return }

    const res = await fetch('/api/calendar/apply-arrangement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        moves: data.displaced.map((d: any) => ({ id: d.id, startTime: d.newStartTime, endTime: d.newEndTime })),
        newEvent: data.pendingEvent,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setSchedulingState({ step: 'error', message: json.error || 'Erreur inconnue' })
      return
    }
    setSchedulingState({ step: 'created' })
  }

  async function downloadAttachment(attachmentId: string, filename: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/emails/${email.id}/attachment/${attachmentId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    // Sans ce contrôle, une erreur serveur (401, 404, timeout Gmail...) était
    // quand même convertie en blob et "téléchargée" comme si c'était le
    // fichier — l'utilisateur se retrouvait avec un fichier du bon nom mais
    // contenant en réalité le JSON de l'erreur.
    if (!res.ok) {
      console.error('Échec du téléchargement de la pièce jointe:', res.status)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.panel}>

      {/* Pièces jointes */}
      {email.attachments && email.attachments.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Pièces jointes ({email.attachments.length})
          </div>
          <div className={styles.attachmentsList}>
            {email.attachments.map(att => (
              <button key={att.attachmentId} className={styles.attachmentItem} onClick={() => downloadAttachment(att.attachmentId, att.filename)}>
                <span className={styles.attachmentIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                </span>
                <div className={styles.attachmentInfo}>
                  <p className={styles.attachmentName}>{att.filename}</p>
                  <p className={styles.attachmentSize}>{formatFileSize(att.size)}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Contact</div>
        <div className={styles.contactRow}>
          <div className={styles.contactAvatar}>{email.sender.charAt(0).toUpperCase()}</div>
          <div>
            <p className={styles.contactName}>{email.sender}</p>
            <a href={`mailto:${email.senderEmail}`} className={styles.contactEmail}>{email.senderEmail}</a>
          </div>
        </div>
      </div>

      {/* Résumé de l'email par l'IA */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>
          Résumé de l'email
        </div>

        {display.dailySummary ? (
          <p className={styles.summaryText}>{display.dailySummary}</p>
        ) : summaryError ? (
          <p className={styles.summaryPending}>Impossible de générer le résumé pour l'instant — réessayez en rouvrant cet email.</p>
        ) : (
          <p className={styles.summaryPending}>Résumé en cours de génération...</p>
        )}

        {display.keyPoints && display.keyPoints.length > 0 && (
          <>
            <p className={styles.keyPointsLabel}>Points clés :</p>
            <ul className={styles.keyPointsList}>
              {display.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </>
        )}

        <div className={styles.summaryMeta}>
          <span>{new Date(email.receivedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          <PriorityBadge priority={display.priority} size="sm" />
        </div>

        <button className={styles.taskBtn} onClick={handleAddTask} disabled={taskAdded}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          {taskAdded ? 'Ajouté aux tâches' : 'Ajouter à mes tâches'}
        </button>

        {/* Planification d'événement détecté, avec gestion des conflits */}
        {display.calendarEventDetected && !email.autoScheduled && (
          <div className={styles.scheduleBlock}>
            {email.schedulingStatus === 'plan_limit' && (
              <a href="/settings?tab=billing" className={styles.planLimitBanner}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5 7 12l5-8 5 8 4.5-2.5L20 19H4z"/></svg>
                Planifié automatiquement jusqu'à 7 jours en Gratuit — Pro n'a pas de limite
              </a>
            )}
            {schedulingState.step === 'idle' && (
              <button className={styles.scheduleBtn} onClick={() => handleScheduleEvent()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Ajouter à l'agenda
              </button>
            )}

            {schedulingState.step === 'loading' && (
              <p className={styles.schedulePending}>Vérification de votre agenda...</p>
            )}

            {schedulingState.step === 'created' && (
              <p className={styles.scheduleSuccess}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Ajouté à votre agenda
              </p>
            )}

            {schedulingState.step === 'error' && (
              <p className={styles.scheduleError}>{schedulingState.message}</p>
            )}

            {schedulingState.step === 'conflict' && (
              <ConflictPlanCard
                requestedStartTime={schedulingState.data.requested.startTime}
                conflictsCount={schedulingState.data.conflicts.length}
                alternative={schedulingState.data.alternative}
                displaced={schedulingState.data.displaced || []}
                atRiskOthers={schedulingState.data.atRiskOthers || []}
                onAcceptAlternative={schedulingState.data.alternative ? () => handleScheduleEvent(schedulingState.data.alternative) : undefined}
                onReorganize={(schedulingState.data.displaced || []).length > 0 ? handleReorganizeFromConflict : undefined}
                onKeepAnyway={() => handleScheduleEvent(schedulingState.data.requested)}
              />
            )}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Actions rapides</div>
        <button className={styles.actionRow} onClick={onToggleRead} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
          {email.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
        </button>
        <button className={styles.actionRow} onClick={onArchive} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          {isArchived ? 'Désarchiver' : 'Archiver'}
        </button>
      </div>

    </div>
  )
}
