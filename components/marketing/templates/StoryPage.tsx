import type { ReactNode } from 'react'
import Link from 'next/link'
import Reveal from '../Reveal'
import { Breadcrumb, PageTail, ReadingProgress } from './PageChrome'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_NOTE } from '@/lib/brand'
import type { BasePage, Qa } from './types'
import styles from './StoryPage.module.css'

// Gabarit « récit » : un hero plein écran avec sa scène animée, puis des
// chapitres qui se révèlent un à un, alternant texte à gauche et texte à
// droite. Pas de grille de cartes du tout — chaque chapitre occupe sa propre
// hauteur, et celle-ci varie selon qu'il porte un visuel ou non.
export interface StoryContent extends BasePage {
  hero: { scene: ReactNode }
  chapters: {
    /** Repère de progression, ex. « 01 » ou « 8 h 40 ». Facultatif. */
    marker?: string
    heading: string
    body: ReactNode
    visual?: ReactNode
    /** Inverse l'ordre texte/visuel. Sans ça, tous les chapitres se
        ressembleraient en miroir. */
    flip?: boolean
  }[]
  faq?: Qa[]
}

export default function StoryPage({ content }: { content: StoryContent }) {
  const { family, breadcrumb, title, lede, hero, chapters, faq, related, cta } = content

  return (
    <div className="mk" data-family={family}>
      <ReadingProgress />

      <div className={styles.heroOuter}>
        <div className={styles.inner}>
          <Breadcrumb items={breadcrumb} />
        </div>

        <div className={`${styles.inner} ${styles.hero}`}>
          <div className={styles.heroText}>
            <Reveal as="h1" from="none" immediate className={styles.title}>{title}</Reveal>
            <Reveal as="p" index={1} immediate className={styles.lede}>{lede}</Reveal>
            <Reveal index={2} immediate className={styles.heroCta}>
              <Link href={CTA_PRIMARY_HREF} className={styles.button}>{CTA_PRIMARY}</Link>
              <span className={styles.note}>{CTA_NOTE}</span>
            </Reveal>
          </div>
          <Reveal index={1} from="scale" immediate className={styles.heroScene}>{hero.scene}</Reveal>
        </div>
      </div>

      <div className={styles.inner}>
        {chapters.map((chapter, i) => (
          <section
            key={chapter.heading}
            className={`${styles.chapter} ${chapter.flip ? styles.chapterFlip : ''} ${chapter.visual ? '' : styles.chapterTextOnly}`}
          >
            <div className={styles.chapterText}>
              {chapter.marker && (
                <Reveal as="span" from="none" className={styles.marker}>{chapter.marker}</Reveal>
              )}
              <Reveal as="h2" index={1} className={styles.chapterHeading}>{chapter.heading}</Reveal>
              <Reveal as="div" index={2} className={styles.chapterBody}>{chapter.body}</Reveal>
            </div>
            {chapter.visual && (
              <Reveal index={1} from={chapter.flip ? 'left' : 'right'} className={styles.chapterVisual}>
                {chapter.visual}
              </Reveal>
            )}
          </section>
        ))}

        <PageTail faq={faq} related={related} cta={cta} />
      </div>
    </div>
  )
}
