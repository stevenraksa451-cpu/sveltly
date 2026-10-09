import type { ReactNode } from 'react'
import Reveal from '../Reveal'
import { Breadcrumb, PageTail, ReadingProgress } from './PageChrome'
import type { BasePage, Qa } from './types'
import styles from './DemoPage.module.css'

// Gabarit « démonstration » : une maquette large au centre, et des
// annotations disposées autour qui pointent vers elle. Le texte ne décrit
// plus l'interface à côté d'une image — il la désigne.
//
// Les annotations sont numérotées parce qu'elles renvoient à des repères
// visibles sur la maquette : ici la numérotation porte une information, elle
// n'est pas décorative.
export interface DemoContent extends BasePage {
  demo: { visual: ReactNode }
  /** Illustration à droite du titre. */
  headerSpot?: ReactNode
  annotations: { n: number; title: string; body: ReactNode }[]
  /** Blocs de texte alternés sous la démonstration. */
  sections: { heading: string; body: ReactNode; note?: string }[]
  faq?: Qa[]
}

export default function DemoPage({ content }: { content: DemoContent }) {
  const { family, breadcrumb, title, lede, demo, headerSpot, annotations, sections, faq, related, cta } = content

  return (
    <div className="mk" data-family={family}>
      <ReadingProgress />
      <div className={styles.page}>
        <Breadcrumb items={breadcrumb} />

        <header className={styles.header}>
          <div className={styles.headerText}>
            <Reveal as="h1" from="none" immediate className={styles.title}>{title}</Reveal>
            <Reveal as="p" index={1} immediate className={styles.lede}>{lede}</Reveal>
          </div>
          {headerSpot && (
            <Reveal index={2} from="scale" className={styles.headerSpot}>{headerSpot}</Reveal>
          )}
        </header>

        <Reveal index={1} from="scale" className={styles.stage}>{demo.visual}</Reveal>

        <ol className={styles.annotations}>
          {annotations.map((a, i) => (
            <Reveal key={a.n} as="li" index={i} className={styles.annotation}>
              <span className={styles.annotationNumber} aria-hidden="true">{a.n}</span>
              <h2 className={styles.annotationTitle}>{a.title}</h2>
              <p className={styles.annotationBody}>{a.body}</p>
            </Reveal>
          ))}
        </ol>

        <div className={styles.sections}>
          {sections.map((section, i) => (
            <section key={section.heading} className={styles.section}>
              <Reveal as="h2" from={i % 2 === 0 ? 'left' : 'right'} className={styles.sectionHeading}>
                {section.heading}
              </Reveal>
              <Reveal as="div" index={1} className={styles.sectionBody}>{section.body}</Reveal>
              {section.note && (
                <Reveal as="p" index={2} className={styles.sectionNote}>{section.note}</Reveal>
              )}
            </section>
          ))}
        </div>

        <PageTail faq={faq} related={related} cta={cta} />
      </div>
    </div>
  )
}
