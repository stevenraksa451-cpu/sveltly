'use client'
import { useState } from 'react'
import { CalendarEvent, Priority } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import ConflictPlanCard from './ConflictPlanCard'
import { compareByStartTimeThenPriority } from '@/lib/scheduling'
import styles from './EventList.module.css'

interface AddEventData {
  title: string
  date: string
  startTime: string
  endTime: string
  description?: string
  color: string
  priority: Priority
}

// Résultat renvoyé par le parent après une tentative de création — soit
// l'événement est créé tel quel ('created'), soit un conflit empêche toute
// écriture et la carte de résolution doit s'afficher ('conflict', voir
// ConflictPlanCard). Jamais d'exception pour le cas conflit : seule une
// vraie erreur réseau/serveur doit faire échouer la promesse.
type AddEventResult =
  | { status: 'created' }
  | { status: 'conflict'; data: any }

interface Props {
  events: CalendarEvent[]
  date: string
  loading?: boolean
  onAddEvent?: (data: AddEventData) => Promise<AddEventResult>
  onDeleteEvent?: (id: string) => Promise<void>
  // Insère quand même pendingEvent à l'horaire donné (accepter l'alternative,
  // ou "garder quand même") — jamais appelé sans que l'utilisateur ait
  // explicitement choisi parmi les options de ConflictPlanCard.
  onForceAddEvent?: (pendingEvent: any, startTime: string, endTime: string) => Promise<void>
  // Applique le plan de réarrangement (déplace `displaced`, puis insère
  // pendingEvent) — uniquement après confirmation explicite via le bouton
  // "Réorganiser ma journée" de ConflictPlanCard.
  onApplyArrangement?: (displaced: any[], pendingEvent: any) => Promise<void>
}

const COLORS = [
  { value: '#1A73E8', label: 'Bleu' },
  { value: '#D93025', label: 'Rouge' },
  { value: '#E37400', label: 'Orange' },
  { value: '#1E8E3E', label: 'Vert' },
  { value: '#8430CE', label: 'Violet' },
  { value: '#5F6368', label: 'Gris' },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]

export default function EventList({ events, date, loading, onAddEvent, onDeleteEvent, onForceAddEvent, onApplyArrangement }: Props) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState('#1A73E8')
  const [selectedPriority, setSelectedPriority] = useState<Priority>('normal')
  // Conflit détecté par le serveur après une tentative de création — tant
  // que ceci n'est pas null, le formulaire reste ouvert et la carte de
  // résolution remplace le bouton "Enregistrer" (voir ConflictPlanCard).
  const [conflict, setConflict] = useState<any | null>(null)
  const [resolving, setResolving] = useState(false)

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const isToday = date === new Date().toISOString().split('T')[0]

  // Tri chronologique, et à heure égale urgent avant important avant normal
  // (voir lib/scheduling.ts — même comparateur que AgendaTimeline, pour que
  // l'ordre d'affichage ne diverge jamais entre les deux vues).
  const sortedEvents = [...events].sort(compareByStartTimeThenPriority)

  function resetForm() {
    setTitle('')
    setStartTime('09:00')
    setEndTime('10:00')
    setDescription('')
    setSelectedColor('#1A73E8')
    setSelectedPriority('normal')
    setConflict(null)
  }

  async function handleAdd() {
    if (!title.trim() || !onAddEvent) return
    setSaving(true)
    setAddError('')
    setConflict(null)
    try {
      const result = await onAddEvent({
        title: title.trim(), date, startTime, endTime, description, color: selectedColor, priority: selectedPriority,
      })
      if (result.status === 'conflict') {
        setConflict(result.data)
      } else {
        resetForm()
        setAdding(false)
      }
    } catch (err: any) {
      // Le formulaire reste ouvert avec ce qui a été tapé, plutôt que de se
      // fermer et de tout effacer comme si l'événement avait été enregistré.
      setAddError(err?.message || 'Erreur lors de la création de l\'événement')
    }
    setSaving(false)
  }

  async function handleAcceptAlternative() {
    if (!conflict || !onForceAddEvent) return
    setResolving(true)
    try {
      await onForceAddEvent(conflict.pendingEvent, conflict.alternative.startTime, conflict.alternative.endTime)
      resetForm()
      setAdding(false)
    } catch (err: any) {
      setAddError(err?.message || 'Erreur lors de la création de l\'événement')
    }
    setResolving(false)
  }

  async function handleKeepAnyway() {
    if (!conflict || !onForceAddEvent) return
    setResolving(true)
    try {
      await onForceAddEvent(conflict.pendingEvent, conflict.requested.startTime, conflict.requested.endTime)
      resetForm()
      setAdding(false)
    } catch (err: any) {
      setAddError(err?.message || 'Erreur lors de la création de l\'événement')
    }
    setResolving(false)
  }

  async function handleReorganize() {
    if (!conflict || !onApplyArrangement) return
    setResolving(true)
    try {
      await onApplyArrangement(conflict.displaced, conflict.pendingEvent)
      resetForm()
      setAdding(false)
    } catch (err: any) {
      setAddError(err?.message || 'Erreur lors de la réorganisation')
    }
    setResolving(false)
  }

  function handleCancel() {
    setAdding(false)
    setAddError('')
    resetForm()
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.dateLabel}>
            {isToday && <span className={styles.todayChip}>Aujourd'hui</span>}
            <p className={styles.dateText}>{formatted}</p>
          </div>
        </div>
        <button className={styles.addTrigger} onClick={() => setAdding(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ajouter
        </button>
      </div>

      {/* Formulaire */}
      {adding && (
        <div className={styles.form}>
          <input
            className={styles.titleInput}
            placeholder="Titre de l'événement"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
            disabled={!!conflict}
          />

          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <label className={styles.timeLabel}>Début</label>
              <input
                type="time"
                className={styles.timeInput}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                disabled={!!conflict}
              />
            </div>
            <div className={styles.timeSep}>→</div>
            <div className={styles.timeField}>
              <label className={styles.timeLabel}>Fin</label>
              <input
                type="time"
                className={styles.timeInput}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                disabled={!!conflict}
              />
            </div>
          </div>

          <input
            className={styles.descInput}
            placeholder="Description (optionnel)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!!conflict}
          />

          <div className={styles.priorityRow}>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                className={`${styles.priorityBtn} ${selectedPriority === p.value ? styles.priorityBtnActive : ''}`}
                onClick={() => setSelectedPriority(p.value)}
                disabled={!!conflict}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button
                key={c.value}
                className={`${styles.colorDot} ${selectedColor === c.value ? styles.colorDotActive : ''}`}
                style={{ background: c.value }}
                onClick={() => setSelectedColor(c.value)}
                title={c.label}
                disabled={!!conflict}
              />
            ))}
          </div>

          {addError && <p className={styles.formError}>{addError}</p>}

          {conflict ? (
            <ConflictPlanCard
              requestedStartTime={conflict.requested.startTime}
              conflictsCount={conflict.conflicts.length}
              alternative={conflict.alternative}
              displaced={conflict.displaced}
              atRiskOthers={conflict.atRiskOthers}
              busy={resolving}
              onAcceptAlternative={conflict.alternative ? handleAcceptAlternative : undefined}
              onReorganize={conflict.displaced?.length > 0 ? handleReorganize : undefined}
              onKeepAnyway={handleKeepAnyway}
              onCancel={handleCancel}
            />
          ) : (
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={handleCancel}>
                Annuler
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleAdd}
                disabled={saving || !title.trim()}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.loading}>
            {[...Array(2)].map((_, i) => (
              <div key={i} className={`${styles.skeletonEvent} skeleton`} />
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Aucun événement</p>
            <p className={styles.emptyDesc}>Cliquez sur Ajouter pour créer un événement</p>
          </div>
        ) : (
          sortedEvents.map(event => (
            <div key={event.id} className={styles.event}>
              <div
                className={styles.colorBar}
                style={{ background: event.color || '#1A73E8' }}
              />
              <div className={styles.eventContent}>
                <div className={styles.eventTop}>
                  <p className={styles.eventTitle}>{event.title}</p>
                  {(event.priority === 'urgent' || event.priority === 'important') && (
                    <PriorityBadge priority={event.priority} size="sm" />
                  )}
                  {onDeleteEvent && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => onDeleteEvent(event.id)}
                      title="Supprimer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
                <p className={styles.eventTime}>
                  {event.startTime} — {event.endTime}
                </p>
                {event.description && (
                  <p className={styles.eventDesc}>{event.description}</p>
                )}
                {event.fromEmailId && (
                  <span className={styles.emailBadge}>Depuis un email</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
