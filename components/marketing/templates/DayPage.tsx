import type { ReactNode } from 'react'
import Reveal from '../Reveal'
import { Breadcrumb, PageTail, ReadingProgress } from './PageChrome'
import type { BasePage, Qa } from './types'
import styles from './DayPage.module.css'

// Gabarit « journée type » : une frise qui suit une journée de 8 h à 18 h.
// La page n'explique pas une fonctionnalité, elle raconte quand elle sert —
// ce qui est souvent plus convaincant.
//
// Le <ol> est volontaire : ces moments ont un ordre, et il compte.
export interface DayContent extends BasePage {
  /** Décor placé en haut à droite, sous le titre. Facultatif. */
  visual?: ReactNode
  moments: {
    time: string
    heading: string
    body: ReactNode
    /** Signale un moment où rien ne se passe — justement le propos. */
    quiet?: boolean
  }[]
  /** Deux ou trois constats après la frise, sans cartes. */
  takeaways?: { heading: string; body: ReactNode }[]
  /** Illustration collante qui accompagne la frise. */
  spot?: ReactNode
  faq?: Qa[]
}

export default function DayPage({ content }: { content: DayContent }) {
  const { family, breadcrumb, title, lede, visual, moments, takeaways, spot, faq, related, cta } = content

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
          {visual && <Reveal index={1} from="right" className={styles.headerVisual}>{visual}</Reveal>}
        </header>

        <div className={styles.timelineRow}>
        <ol className={styles.timeline}>
          {moments.map((moment, i) => (
            <Reveal
              key={moment.time}
              as="li"
              index={Math.min(i, 5)}
              from="left"
              className={`${styles.moment} ${moment.quiet ? styles.momentQuiet : ''}`}
            >
              <span className={styles.time}>{moment.time}</span>
              <span className={styles.rail} aria-hidden="true" />
              <div className={styles.momentBody}>
                <h2 className={styles.momentHeading}>{moment.heading}</h2>
                <div className={styles.momentText}>{moment.body}</div>
              </div>
            </Reveal>
          ))}
        </ol>
          {spot && <Reveal from="scale" className={styles.timelineSpot}>{spot}</Reveal>}
        </div>

        {takeaways && takeaways.length > 0 && (
          <div className={styles.takeaways}>
            {takeaways.map((item, i) => (
              <Reveal key={item.heading} index={i} className={styles.takeaway}>
                <h2 className={styles.takeawayHeading}>{item.heading}</h2>
                <div className={styles.takeawayBody}>{item.body}</div>
              </Reveal>
            ))}
          </div>
        )}

        <PageTail faq={faq} related={related} cta={cta} />
      </div>
    </div>
  )
}
