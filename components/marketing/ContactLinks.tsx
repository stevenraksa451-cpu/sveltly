import Reveal from './Reveal'
import { BRAND_EMAIL } from '@/lib/brand'
import styles from './ContactLinks.module.css'

// Sujets pré-remplis. Pas de cartes : une liste de lignes séparées par un
// filet, comme HubList — c'est le même geste de navigation, il doit se
// présenter de la même façon.
const SUBJECTS = [
  { label: 'Une question sur le produit', subject: 'Question sur Sveltly', hint: 'Ce que Sveltly fait, ou ne fait pas.' },
  { label: 'Signaler un problème', subject: 'Problème rencontré sur Sveltly', hint: 'Dites ce que vous faisiez et ce qui s’est passé.' },
  { label: 'Passer au forfait Pro', subject: 'Passage au forfait Pro', hint: 'Le paiement en ligne n’est pas branché ; on s’en occupe à la main.' },
  { label: 'Une suggestion', subject: 'Suggestion pour Sveltly', hint: 'Ce qui vous manque, ce qui vous gêne.' },
]

export default function ContactLinks() {
  return (
    <section className={styles.section}>
      <ul className={styles.list}>
        {SUBJECTS.map((s, i) => (
          <Reveal key={s.label} as="li" index={i} className={styles.item}>
            <a
              href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent(s.subject)}`}
              className={styles.link}
            >
              <span className={styles.label}>{s.label}</span>
              <span className={styles.hint}>{s.hint}</span>
              <span className={styles.mail}>{BRAND_EMAIL}</span>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
