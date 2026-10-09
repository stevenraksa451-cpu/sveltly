'use client'
import { ReactNode, useState } from 'react'
import styles from './FaqAccordion.module.css'

// <details>/<summary> natifs auraient suffi, mais ils n'offrent aucun contrôle
// sur l'animation d'ouverture et ne permettent pas de refermer la question
// précédente. Ici : un seul panneau ouvert à la fois, et une hauteur animée
// via grid-template-rows (0fr → 1fr), sans mesure JS ni max-height arbitraire.
export default function FaqAccordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className={styles.list}>
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={item.q} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
            <h3 className={styles.questionHeading}>
              <button
                type="button"
                className={styles.question}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                {item.q}
                <svg
                  className={styles.chevron} width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </h3>
            <div id={`faq-panel-${i}`} className={styles.panel} role="region">
              <div className={styles.panelInner}>
                <p className={styles.answer}>{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
