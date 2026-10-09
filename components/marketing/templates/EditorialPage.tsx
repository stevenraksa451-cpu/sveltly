import type { ReactNode } from 'react'
import Reveal from '../Reveal'
import { Breadcrumb, PageTail, ReadingProgress } from './PageChrome'
import type { BasePage, Qa } from './types'
import styles from './EditorialPage.module.css'

// Gabarit « éditorial » : grande typographie, colonnes asymétriques, peu de
// cadres. Le rythme vient des largeurs de colonne qui changent d'un bloc à
// l'autre, pas d'une grille de cartes. Convient aux pages qui expliquent une
// position plutôt qu'une mécanique.
export interface EditorialContent extends BasePage {
  /** Chapô en pleine largeur, sous le titre. */
  standfirst?: ReactNode
  /** Illustration d'accompagnement, à droite du titre. */
  headerSpot?: ReactNode
  /** Blocs de texte. `aside` s'affiche en colonne étroite, décalée. */
  blocks: {
    heading?: string
    body: ReactNode
    aside?: ReactNode
    /** Chiffre mis en avant à la place de l'aparté. */
    figure?: { value: string; caption: string }
    /** Illustration dans la troisième colonne. */
    spot?: ReactNode
  }[]
  /** Citation ou phrase isolée, en pleine largeur. */
  pullQuote?: ReactNode
  faq?: Qa[]
  visual?: ReactNode
}

// `children` s'insère entre les blocs et la phrase isolée : c'est là que les
// pages d'aperçu glissent leur liste de sous-pages.
export default function EditorialPage({ content, children }: {
  content: EditorialContent
  children?: ReactNode
}) {
  const { family, breadcrumb, title, lede, standfirst, headerSpot, blocks, pullQuote, visual, faq, related, cta } = content

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

        {visual && <Reveal index={2} from="scale" className={styles.visual}>{visual}</Reveal>}

        {standfirst && (
          <div className={styles.standfirstRow}>
            <Reveal as="p" className={styles.standfirst}>{standfirst}</Reveal>
          </div>
        )}

        {blocks.map((block, i) => (
          <section key={i} className={styles.block}>
            <div className={styles.blockMain}>
              {block.heading && <Reveal as="h2" className={styles.blockHeading}>{block.heading}</Reveal>}
              <Reveal as="div" index={1} className={styles.blockBody}>{block.body}</Reveal>
            </div>

            {/* La colonne de droite n'existe que si elle a quelque chose à
                dire. Une colonne vide répétée à chaque bloc produirait
                exactement la régularité qu'on cherche à éviter. */}
            {(block.aside || block.figure) && (
              <Reveal index={2} from="right" className={styles.blockAside}>
                {block.figure ? (
                  <>
                    <span className={styles.figureValue}>{block.figure.value}</span>
                    <span className={styles.figureCaption}>{block.figure.caption}</span>
                  </>
                ) : (
                  <p className={styles.asideText}>{block.aside}</p>
                )}
              </Reveal>
            )}

            {block.spot && (
              <Reveal index={3} from="scale" className={styles.blockSpot}>{block.spot}</Reveal>
            )}
          </section>
        ))}

        {children}

        {pullQuote && (
          <Reveal as="blockquote" from="scale" className={styles.pullQuote}>{pullQuote}</Reveal>
        )}

        <PageTail faq={faq} related={related} cta={cta} />
      </div>
    </div>
  )
}
