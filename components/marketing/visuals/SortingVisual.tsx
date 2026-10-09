'use client'
import { useInViewLoop } from '../useInViewLoop'
import styles from './SortingVisual.module.css'

// Des lignes d'emails arrivent en vrac, puis glissent vers trois colonnes.
// La boucle est volontairement lente (11 s) : c'est un décor qu'on remarque
// en passant, pas une animation qui réclame l'attention.
//
// Chaque ligne porte --d (son rang) ; tous les retards en découlent, ce qui
// évite une keyframe par ligne.
const LINES = [
  { lane: 0, label: 'Devis à valider avant vendredi' },
  { lane: 1, label: 'Réunion déplacée à 15 h' },
  { lane: 2, label: 'Newsletter hebdomadaire' },
  { lane: 1, label: 'Facture n° 2291' },
  { lane: 2, label: 'Votre commande est partie' },
  { lane: 0, label: 'Serveur de production en panne' },
]

const LANES = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'important', label: 'Important' },
  { key: 'normal', label: 'Normal' },
]

export default function SortingVisual() {
  const ref = useInViewLoop<HTMLDivElement>()

  return (
    <div className={styles.wrap} ref={ref} aria-hidden="true">
      <div className={styles.lanes}>
        {LANES.map(lane => (
          <div key={lane.key} className={styles.lane}>
            <span className={`${styles.laneLabel} ${styles[lane.key]}`}>{lane.label}</span>
            <span className={styles.laneTrack} />
          </div>
        ))}
      </div>

      <div className={styles.stack}>
        {LINES.map((line, i) => (
          <div
            key={line.label}
            className={styles.line}
            data-lane={line.lane}
            style={{ '--d': i } as React.CSSProperties}
          >
            <span className={styles.dot} />
            <span className={styles.label}>{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
