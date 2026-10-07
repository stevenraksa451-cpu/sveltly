'use client'
// components/calendar/ReorganizeDayPanel.tsx
// Aperçu du plan de réarrangement d'une journée entière (bouton "Réorganiser
// ma journée" de /calendar) — chaque déplacement proposé peut être décoché
// individuellement (ex: un événement que l'utilisateur préfère laisser en
// conflit) ; rien n'est écrit tant que "Appliquer" n'a pas été cliqué.
import { useState } from 'react'
import styles from './ReorganizeDayPanel.module.css'

interface Move {
  id: string
  title: string
  originalStartTime: string
  originalEndTime: string
  newStartTime: string
  newEndTime: string
  moved: boolean
  atRisk: boolean
}

interface Props {
  moves: Move[]
  busy?: boolean
  onApply: (selected: { id: string; startTime: string; endTime: string }[]) => Promise<void>
  onClose: () => void
}

export default function ReorganizeDayPanel({ moves, busy, onApply, onClose }: Props) {
  const movable = moves.filter(m => m.moved)
  const atRisk = moves.filter(m => m.atRisk)
  const [checked, setChecked] = useState<Set<string>>(new Set(movable.map(m => m.id)))

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleApply() {
    const selected = movable
      .filter(m => checked.has(m.id))
      .map(m => ({ id: m.id, startTime: m.newStartTime, endTime: m.newEndTime }))
    if (selected.length === 0) return
    await onApply(selected)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.title}>Réorganiser la journée</p>
        <button className={styles.closeBtn} onClick={onClose} disabled={busy}>Fermer</button>
      </div>

      {movable.length === 0 && atRisk.length === 0 ? (
        <p className={styles.empty}>Aucun conflit à résoudre aujourd'hui.</p>
      ) : (
        <>
          {movable.length > 0 && (
            <ul className={styles.list}>
              {movable.map(m => (
                <li key={m.id} className={styles.item}>
                  <label className={styles.itemLabel}>
                    <input
                      type="checkbox"
                      checked={checked.has(m.id)}
                      onChange={() => toggle(m.id)}
                      disabled={busy}
                    />
                    <span>
                      <strong>{m.title || 'Événement'}</strong> : {m.originalStartTime} → {m.newStartTime}–{m.newEndTime}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {atRisk.length > 0 && (
            <p className={styles.warning}>
              ⚠ {atRisk.map(m => m.title || 'Événement').join(', ')} ne pourrai{atRisk.length > 1 ? 'ent' : 't'} pas être recasé{atRisk.length > 1 ? 's' : ''} ce jour-là — à traiter manuellement.
            </p>
          )}

          {movable.length > 0 && (
            <button className={styles.applyBtn} onClick={handleApply} disabled={busy || checked.size === 0}>
              {busy ? 'Application...' : `Appliquer (${checked.size})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
