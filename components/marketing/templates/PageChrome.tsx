import { isValidElement, type ReactNode } from 'react'
import Link from 'next/link'
import Reveal from '../Reveal'
import FaqAccordion from '../FaqAccordion'
import ReadingProgress from '../ReadingProgress'
import { labelForHref } from '@/lib/navigation'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_NOTE, SITE_URL } from '@/lib/brand'
import type { BasePage, Qa } from './types'
import styles from './PageChrome.module.css'

// Ce qui entoure toute page marketing : fil d'Ariane, barre de progression,
// FAQ, « voir aussi », appel final. Les gabarits s'occupent du milieu —
// c'est-à-dire de la façon de raconter le sujet.
//
// Le pied de page n'est PAS ici : il doit rester en pleine largeur, donc
// hors du conteneur des gabarits. Il est posé une fois pour toutes dans
// app/(marketing)/layout.tsx.

// Texte brut d'un ReactNode. Les réponses de FAQ sont rédigées en JSX
// (<p>, <strong>, <Brand />…) alors que le balisage schema.org attend une
// chaîne : on aplatit l'arbre une fois, au rendu serveur.
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join(' ')
  if (isValidElement(node)) return nodeToText((node.props as { children?: ReactNode }).children)
  return ''
}

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Construit uniquement à partir du contenu éditorial du site
      // (lib/content/*), jamais d'une donnée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function Breadcrumb({ items }: { items: { label: string; href: string }[] }) {
  // BreadcrumbList : Google affiche alors le chemin « Accueil › Produit ›
  // Tri intelligent » sous le résultat, au lieu de l'URL brute. Le fil était
  // déjà là visuellement, il n'était simplement pas déclaré aux moteurs.
  const trail = [{ label: 'Accueil', href: '/' }, ...items]

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.label,
          item: `${SITE_URL}${item.href === '/' ? '' : item.href}`,
        })),
      }} />
      <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
        <ol>
          <li><Link href="/">Accueil</Link></li>
          {items.map(item => (
            <li key={item.href}>
              <span aria-hidden="true">/</span>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

export function PageTail({ faq, related, cta }: {
  faq?: Qa[]
  related?: string[]
  cta?: BasePage['cta']
}) {
  return (
    <>
      {faq && faq.length > 0 && (
        <section className={styles.tailSection}>
          {/* FAQPage : rend la page éligible au bloc de questions déroulantes
              directement dans les résultats Google. Les questions existaient
              déjà en données structurées côté code (Qa[]) — elles n'étaient
              simplement jamais déclarées aux moteurs. */}
          <JsonLd data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: nodeToText(item.a) },
            })),
          }} />
          <Reveal as="h2" className={styles.tailTitle}>Ce qu’on nous demande</Reveal>
          <Reveal index={1}><FaqAccordion items={faq} /></Reveal>
        </section>
      )}

      {related && related.length > 0 && (
        <section className={styles.tailSection}>
          <Reveal as="h2" className={styles.tailTitle}>Pour aller plus loin</Reveal>
          <div className={styles.related}>
            {related.map((href, i) => (
              <Reveal key={href} index={i} from="up">
                <Link href={href} className={styles.relatedLink}>
                  <span>{labelForHref(href) ?? href}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className={styles.cta}>
        <Reveal as="h2" className={styles.ctaTitle}>{cta?.title ?? 'Essayez sur votre vraie boîte'}</Reveal>
        <Reveal as="p" index={1} className={styles.ctaBody}>
          {cta?.body ?? 'Connectez Gmail, laissez passer une matinée, et regardez ce qui remonte.'}
        </Reveal>
        <Reveal index={2}>
          <Link href={CTA_PRIMARY_HREF} className={styles.ctaButton}>{cta?.label ?? CTA_PRIMARY}</Link>
          <span className={styles.ctaNote}>{CTA_NOTE}</span>
        </Reveal>
      </section>
    </>
  )
}

export { ReadingProgress }
