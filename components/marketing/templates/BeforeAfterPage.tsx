'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Reveal from '../Reveal'
import { Breadcrumb, PageTail, ReadingProgress } from './PageChrome'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_NOTE } from '@/lib/brand'
import type { BasePage, Qa } from './types'
import styles from './BeforeAfterPage.module.css'

// Gabarit « avant / après » : une bascule montre le même contenu dans ses
// deux états. Le propos de la page EST la différence entre les deux — la
// montrer vaut mieux que la décrire.
//
// Bascule explicite plutôt que curseur de glissement : au clavier, un bouton
// à deux états se manipule sans effort, là où un curseur demande un pas, des
// bornes et une valeur annoncée pour un bénéfice nul ici.
export interface BeforeAfterContent extends BasePage {
  toggle: {
    beforeLabel: string
    afterLabel: string
    before: ReactNode
    after: ReactNode
    /** Légende qui change avec l'état. */
    beforeCaption: string
    afterCaption: string
  }
  /** Paragraphes longs sous la démonstration, en colonne étroite. */
  sections: { heading: string; body: ReactNode }[]
  /** Liste de points, sans cartes : un filet et du texte. */
  details?: { term: string; description: ReactNode }[]
  /** Illustration qui accompagne le texte, en colonne de droite. */
  spot?: ReactNode
  faq?: Qa[]
}

export default function BeforeAfterPage({ content }: { content: BeforeAfterContent }) {
  const { family, breadcrumb, title, lede, toggle, sections, details, spot, faq, related, cta } = content
  const [showAfter, setShowAfter] = useState(true)

  return (
    <div className="mk" data-family={family}>
      <ReadingProgress />
      <div className={styles.page}>
        <Breadcrumb items={breadcrumb} />

        <header className={styles.header}>
          <Reveal as="h1" from="none" immediate className={styles.title}>{title}</Reveal>
          <Reveal as="p" index={1} immediate className={styles.lede}>{lede}</Reveal>
        </header>

        <Reveal index={1} from="scale" className={styles.demo}>
          <div className={styles.switchRow}>
            {/* role="group" + aria-pressed : deux boutons bascule plutôt qu'un
                onglet, parce qu'on ne change pas de panneau de contenu mais
                l'état d'une même chose. */}
            <div className={styles.switch} role="group" aria-label="Comparer avant et après le tri">
              <button
                type="button"
                className={`${styles.switchBtn} ${!showAfter ? styles.switchBtnOn : ''}`}
                aria-pressed={!showAfter}
                onClick={() => setShowAfter(false)}
              >
                {toggle.beforeLabel}
              </button>
              <button
                type="button"
                className={`${styles.switchBtn} ${showAfter ? styles.switchBtnOn : ''}`}
                aria-pressed={showAfter}
                onClick={() => setShowAfter(true)}
              >
                {toggle.afterLabel}
              </button>
              <span className={`${styles.switchThumb} ${showAfter ? styles.switchThumbRight : ''}`} aria-hidden="true" />
            </div>
          </div>

          {/* Les deux états sont empilés et superposés : la hauteur du bloc ne
              change pas à la bascule, donc rien ne saute autour. */}
          <div className={styles.stage}>
            <div className={`${styles.state} ${showAfter ? styles.stateHidden : ''}`} aria-hidden={showAfter}>
              {toggle.before}
            </div>
            <div className={`${styles.state} ${showAfter ? '' : styles.stateHidden}`} aria-hidden={!showAfter}>
              {toggle.after}
            </div>
          </div>

          <p className={styles.caption} aria-live="polite">
            {showAfter ? toggle.afterCaption : toggle.beforeCaption}
          </p>
        </Reveal>

        <div className={styles.proseRow}>
          <div className={styles.prose}>
            {sections.map(section => (
              <section key={section.heading} className={styles.section}>
                <Reveal as="h2" className={styles.sectionHeading}>{section.heading}</Reveal>
                <Reveal as="div" index={1} className={styles.sectionBody}>{section.body}</Reveal>
              </section>
            ))}
          </div>
          {spot && <Reveal from="scale" className={styles.proseSpot}>{spot}</Reveal>}
        </div>

        {details && details.length > 0 && (
          <dl className={styles.details}>
            {details.map((detail, i) => (
              <Reveal key={detail.term} index={i} as="div" className={styles.detail}>
                <dt className={styles.detailTerm}>{detail.term}</dt>
                <dd className={styles.detailDesc}>{detail.description}</dd>
              </Reveal>
            ))}
          </dl>
        )}

        <Reveal className={styles.midCta}>
          <Link href={CTA_PRIMARY_HREF} className={styles.button}>{CTA_PRIMARY}</Link>
          <span className={styles.note}>{CTA_NOTE}</span>
        </Reveal>

        <PageTail faq={faq} related={related} cta={cta} />
      </div>
    </div>
  )
}
