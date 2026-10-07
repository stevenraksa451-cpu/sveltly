'use client'
// components/calendar/ConflictPlanCard.tsx
// Carte de résolution de conflit partagée — même rendu et mêmes choix partout
// où un conflit d'agenda peut survenir (InboxSidePanel, EmailDetail,
// EventList) : accepter le créneau alternatif pour le nouvel événement,
// réorganiser la journée (déplace les événements moins prioritaires), ou
// garder quand même l'horaire demandé (superposition volontaire). N'écrit
// jamais elle-même — purement présentationnelle, chaque bouton délègue à
// l'appelant via les callbacks.
import styles from './ConflictPlanCard.module.css'

export interface DisplacedItem {
  id: string
  title: string
  originalStartTime: string
  newStartTime: string
  newEndTime: string
}

export interface AtRiskItem {
  id: string
  title: string
}

export interface ConflictPlanCardProps {
  requestedStartTime: string
  conflictsCount: number
  alternative: { startTime: string; endTime: string } | null
  displaced: DisplacedItem[]
  atRiskOthers: AtRiskItem[]
  busy?: boolean
  onAcceptAlternative?: () => void
  onReorganize?: () => void
  onKeepAnyway: () => void
  onCancel?: () => void
}

export default function ConflictPlanCard({
  requestedStartTime,
  conflictsCount,
  alternative,
  displaced,
  atRiskOthers,
  busy,
  onAcceptAlternative,
  onReorganize,
  onKeepAnyway,
  onCancel,
}: ConflictPlanCardProps) {
  return (
    <div className={styles.card}>
      <p className={styles.title}>Conflit détecté à {requestedStartTime}</p>
      <p className={styles.desc}>
        Cet horaire chevauche {conflictsCount} événement{conflictsCount > 1 ? 's' : ''} déjà prévu{conflictsCount > 1 ? 's' : ''}.
      </p>

      {displaced.length > 0 && (
        <div className={styles.plan}>
          <p className={styles.planLabel}>Réorganiser déplacerait :</p>
          <ul className={styles.planList}>
            {displaced.map(d => (
              <li key={d.id} className={styles.planItem}>
                <strong>{d.title || 'Événement'}</strong> : {d.originalStartTime} → {d.newStartTime}–{d.newEndTime}
              </li>
            ))}
          </ul>
          {atRiskOthers.length > 0 && (
            <p className={styles.planWarning}>
              ⚠ {atRiskOthers.map(a => a.title || 'Événement').join(', ')} ne pourrai{atRiskOthers.length > 1 ? 'ent' : 't'} pas être recasé{atRiskOthers.length > 1 ? 's' : ''} ce jour-là — à traiter manuellement.
            </p>
          )}
          {onReorganize && (
            <button className={styles.primaryBtn} onClick={onReorganize} disabled={busy}>
              Réorganiser ma journée
            </button>
          )}
        </div>
      )}

      {alternative && (
        <div className={styles.plan}>
          <p className={styles.alt}>
            Créneau libre suggéré : <strong>{alternative.startTime} – {alternative.endTime}</strong>
          </p>
          {onAcceptAlternative && (
            <button className={styles.primaryBtn} onClick={onAcceptAlternative} disabled={busy}>
              Utiliser ce créneau
            </button>
          )}
        </div>
      )}

      {!alternative && displaced.length === 0 && (
        <p className={styles.desc}>Aucun créneau libre trouvé ce jour-là dans vos heures de disponibilité.</p>
      )}

      <div className={styles.actions}>
        <button className={styles.keepBtn} onClick={onKeepAnyway} disabled={busy}>
          Garder l'heure d'origine quand même
        </button>
        {onCancel && (
          <button className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}
