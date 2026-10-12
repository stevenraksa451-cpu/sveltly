'use client'
import { useEffect, useState } from 'react'
import {
  ANNOUNCEMENT_ENABLED, ANNOUNCEMENT_ID, ANNOUNCEMENT_TEXT, ANNOUNCEMENT_HREF,
} from './navConfig'
import styles from './AnnouncementBar.module.css'

const STORAGE_KEY = 'sveltly-announcement-dismissed'

export default function AnnouncementBar() {
  // Démarre à `false` — donc le bandeau est rendu — aussi bien sur le serveur
  // qu'au premier rendu client. C'est ce qui évite l'erreur d'hydratation :
  // lire localStorage dès l'état initial produirait un HTML client différent
  // de celui du serveur, qui ne sait rien du navigateur. La vérification a
  // lieu juste après, dans l'effet ci-dessous.
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === ANNOUNCEMENT_ID) setDismissed(true)
    } catch {
      // Navigation privée ou stockage bloqué : le bandeau reste affiché.
      // Mieux vaut le montrer une fois de trop que planter au chargement.
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT_ID)
    } catch { /* idem : l'échec du stockage ne doit rien casser */ }
  }

  if (!ANNOUNCEMENT_ENABLED || dismissed) return null

  return (
    <div className={`mkc ${styles.bar}`}>
      <a href={ANNOUNCEMENT_HREF} className={styles.link}>
        <span className={styles.dot} aria-hidden="true" />
        {ANNOUNCEMENT_TEXT}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
      <button type="button" className={styles.close} onClick={dismiss} aria-label="Masquer cette annonce">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
