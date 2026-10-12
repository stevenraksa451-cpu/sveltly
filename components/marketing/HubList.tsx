import Link from 'next/link'
import Reveal from './Reveal'
import type { NavLink } from '@/lib/navigation'
import styles from './HubList.module.css'

// Liste des sous-pages d'une rubrique. Volontairement une LISTE, pas une
// grille de cartes : les pages d'aperçu étaient précisément l'endroit où
// trois cartes identiques s'empilaient sous chaque hero. Ici, un filet par
// ligne, le titre à gauche, la description à droite, et c'est tout.
export default function HubList({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <section className={styles.section}>
      <Reveal as="h2" className={styles.title}>{title}</Reveal>
      <ul className={styles.list}>
        {links.map((link, i) => (
          <Reveal key={link.href} as="li" index={Math.min(i, 5)} className={styles.item}>
            <Link href={link.href} className={styles.link}>
              <span className={styles.label}>
                {link.label}
                {link.tag && <span className={styles.tag}>{link.tag}</span>}
              </span>
              <span className={styles.desc}>{link.desc}</span>
              <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
