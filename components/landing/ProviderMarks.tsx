import { PROVIDERS, PLANNED_BADGE } from '@/lib/providers'
import styles from './ProviderMarks.module.css'

// Boîtes mail prises en charge, sous le bouton du hero.
//
// SVG en ligne et non des images : deux marques pèsent moins que deux requêtes
// réseau, restent nettes à toute densité, et évitent d'embarquer des fichiers
// de marque dans public/. C'est aussi la règle du projet — ni bibliothèque
// d'icônes, ni dépendance ajoutée (voir CLAUDE.md).
//
// En couleur, contrairement aux icônes de réseaux sociaux de la barre du haut :
// ici elles répondent à la première question d'un visiteur — « est-ce que ça
// marche avec MA boîte ? ». Une version grise les rendrait indistinctes.
//
// Ce que la liste affiche vient de lib/providers.ts, y compris l'étiquette
// « Bientôt ». Montrer la marque Outlook sans dire qu'elle n'est pas encore
// connectable serait une fausse promesse, et le reste du site dit l'inverse.

function GmailMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={styles.mark}>
      <path fill="#4285F4" d="M22 7.4v10.4c0 .7-.6 1.2-1.2 1.2h-2.5V9.9L12 14.3 5.7 9.9V19H3.2c-.7 0-1.2-.5-1.2-1.2V7.4l10 7 10-7z" />
      <path fill="#34A853" d="M2 17.8c0 .7.5 1.2 1.2 1.2h2.5V9.9L2 7.4z" />
      <path fill="#FBBC04" d="M18.3 19h2.5c.6 0 1.2-.5 1.2-1.2V7.4l-3.7 2.5z" />
      <path fill="#EA4335" d="M2 7.4V6.2C2 5.1 3.2 4.5 4 5.1l8 5.7 8-5.7c.8-.6 2 0 2 1.1v1.2l-10 7z" />
    </svg>
  )
}

function OutlookMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={styles.mark}>
      <rect x="2" y="4.6" width="10.6" height="14.8" rx="1.6" fill="#0F6CBD" />
      <path
        fill="#fff"
        d="M7.3 8.3c-1.7 0-2.9 1.5-2.9 3.7s1.2 3.7 2.9 3.7 2.9-1.5 2.9-3.7-1.2-3.7-2.9-3.7zm0 1.7c.8 0 1.3.8 1.3 2s-.5 2-1.3 2-1.3-.8-1.3-2 .5-2 1.3-2z"
      />
      <path fill="#28A8EA" d="M13.4 7.6H22v9.6c0 .7-.6 1.2-1.2 1.2h-7.4z" />
      <path fill="#0F6CBD" d="m13.4 10.1 4.3 2.8 4.3-2.8v1.7l-4.3 2.9-4.3-2.9z" />
    </svg>
  )
}

const MARQUES = {
  gmail: <GmailMark />,
  outlook: <OutlookMark />,
}

export default function ProviderMarks() {
  return (
    <ul className={styles.row}>
      {PROVIDERS.map(({ id, name, status }) => (
        <li key={id} className={`${styles.item} ${status === 'planned' ? styles.planned : ''}`}>
          {MARQUES[id]}
          <span className={styles.name}>{name}</span>
          {status === 'planned' && <span className={styles.badge}>{PLANNED_BADGE}</span>}
        </li>
      ))}
    </ul>
  )
}
