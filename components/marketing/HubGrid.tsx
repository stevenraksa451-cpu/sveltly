import Link from 'next/link'
import Icon from './Icon'
import type { NavLink } from '@/lib/navigation'
import styles from './HubGrid.module.css'

// Grille de cartes des pages d'aperçu (/produit, /solutions, /securite).
// Alimentée par les mêmes tableaux que la barre de navigation — une page
// ajoutée dans lib/navigation.ts apparaît ici automatiquement.
/** Titre + grille, pour insérer un bloc d'aperçu dans une page marketing. */
export function HubSection({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <HubGrid links={links} />
    </section>
  )
}

export default function HubGrid({ links }: { links: NavLink[] }) {
  return (
    <div className={styles.grid}>
      {links.map(link => (
        <Link key={link.href} href={link.href} className={styles.card}>
          <span className={styles.icon} aria-hidden="true"><Icon name={link.icon} /></span>
          <span className={styles.body}>
            <span className={styles.title}>
              {link.label}
              {link.tag && <span className={styles.tag}>{link.tag}</span>}
            </span>
            <span className={styles.desc}>{link.desc}</span>
          </span>
          <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
