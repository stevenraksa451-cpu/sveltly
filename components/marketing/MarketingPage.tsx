import { ReactNode } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import SiteFooter from './SiteFooter'
import FaqAccordion from './FaqAccordion'
import { labelForHref, type IconKey } from '@/lib/navigation'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_NOTE } from '@/lib/brand'
import styles from './MarketingPage.module.css'

export interface MarketingContent {
  breadcrumb: { label: string; href: string }[]
  hero: { title: ReactNode; subtitle: ReactNode; mock?: ReactNode }
  /** Problème puis solution — deux blocs courts, côte à côte. */
  problem?: { title: string; body: ReactNode }
  solution?: { title: string; body: ReactNode }
  steps?: { title: string; desc: ReactNode }[]
  features?: { icon: IconKey; title: string; desc: ReactNode; tag?: string }[]
  /** Journée type : un exemple concret, écrit, pas un témoignage attribué. */
  story?: { title: string; intro?: ReactNode; moments: { time: string; text: ReactNode }[] }
  faq?: { q: string; a: ReactNode }[]
  /** Routes connues de lib/navigation.ts — les libellés en sont déduits. */
  related?: string[]
}

// Modèle commun à toutes les pages marketing de détail. Chaque bloc est
// optionnel : une page "vue d'ensemble" n'a pas de journée type, une page
// contact n'a ni étapes ni fonctionnalités. L'ordre, lui, est fixe — c'est ce
// qui donne au site un rythme reconnaissable d'une page à l'autre.
// `children` est inséré entre la journée type et la mini-FAQ : c'est là que
// les pages d'aperçu glissent leur grille de sous-pages, et la page Tarifs
// son tableau comparatif.
export default function MarketingPage({ content, children }: { content: MarketingContent; children?: ReactNode }) {
  const { breadcrumb, hero, problem, solution, steps, features, story, faq, related } = content

  return (
    <>
      <main className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <ol className={styles.breadcrumbList}>
            <li><Link href="/">Accueil</Link></li>
            {breadcrumb.map(b => (
              <li key={b.href}>
                <span className={styles.sep} aria-hidden="true">/</span>
                <Link href={b.href}>{b.label}</Link>
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            {/* Une seule balise h1 par page : c'est celle-ci. */}
            <h1 className={styles.heroTitle}>{hero.title}</h1>
            <p className={styles.heroSubtitle}>{hero.subtitle}</p>
            <div className={styles.heroCta}>
              <Link href={CTA_PRIMARY_HREF} className={styles.ctaPrimary}>{CTA_PRIMARY}</Link>
              <span className={styles.ctaNote}>{CTA_NOTE}</span>
            </div>
          </div>
          {hero.mock && <div className={styles.heroMock}>{hero.mock}</div>}
        </section>

        {(problem || solution) && (
          <section className={styles.contrast}>
            {problem && (
              <div className={`${styles.contrastCard} ${styles.contrastProblem}`}>
                <h2 className={styles.contrastTitle}>{problem.title}</h2>
                <p className={styles.contrastBody}>{problem.body}</p>
              </div>
            )}
            {solution && (
              <div className={`${styles.contrastCard} ${styles.contrastSolution}`}>
                <h2 className={styles.contrastTitle}>{solution.title}</h2>
                <p className={styles.contrastBody}>{solution.body}</p>
              </div>
            )}
          </section>
        )}

        {steps && steps.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Comment ça marche</h2>
            <ol className={styles.steps}>
              {steps.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {features && features.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Dans le détail</h2>
            <div className={styles.featureGrid}>
              {features.map(f => (
                <div key={f.title} className={styles.featureCard}>
                  <span className={styles.featureIcon} aria-hidden="true"><Icon name={f.icon} /></span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {story && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{story.title}</h2>
            {story.intro && <p className={styles.storyIntro}>{story.intro}</p>}
            <ol className={styles.timeline}>
              {story.moments.map(m => (
                <li key={m.time} className={styles.moment}>
                  <span className={styles.momentTime}>{m.time}</span>
                  <span className={styles.momentLine} aria-hidden="true" />
                  <p className={styles.momentText}>{m.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {children}

        {faq && faq.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
            <FaqAccordion items={faq} />
          </section>
        )}

        {related && related.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Voir aussi</h2>
            <div className={styles.relatedGrid}>
              {related.map(href => (
                <Link key={href} href={href} className={styles.relatedCard}>
                  {labelForHref(href) ?? href}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className={styles.finalCta}>
          <h2 className={styles.finalCtaTitle}>Essayez, c’est gratuit</h2>
          <p className={styles.finalCtaDesc}>
            Connectez votre boîte Gmail et voyez le premier tri en quelques minutes.
          </p>
          <Link href={CTA_PRIMARY_HREF} className={styles.ctaPrimary}>{CTA_PRIMARY}</Link>
          <span className={styles.ctaNote}>{CTA_NOTE}</span>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
