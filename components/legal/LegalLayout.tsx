'use client'
// components/legal/LegalLayout.tsx
// Mise en page partagée pour /legal/privacy et /legal/terms — sommaire
// collant avec suivi de la section visible (scroll-spy), encadré "l'essentiel"
// en clair avant le texte juridique complet, icône par section. La plupart
// des pages légales de SaaS sont un mur de texte sans hiérarchie ; celle-ci
// est pensée pour qu'on puisse soit tout lire, soit sauter directement à ce
// qui nous intéresse en 10 secondes.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import styles from './LegalLayout.module.css'

export interface LegalSection {
  id: string
  icon: ReactNode
  title: string
  content: ReactNode
}

export default function LegalLayout({
  title,
  updated,
  readingMinutes,
  essentialsTitle,
  essentials,
  sections,
}: {
  title: string
  updated: string
  readingMinutes: number
  essentialsTitle: string
  essentials: { icon: ReactNode; text: ReactNode }[]
  sections: LegalSection[]
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // Parmi les sections actuellement visibles, on retient la plus haute
        // à l'écran — plus fiable qu'un simple "premier event reçu", qui
        // saute sinon de façon erratique quand plusieurs sections sont
        // visibles en même temps sur un grand écran.
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(top.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )

    sections.forEach(s => {
      const el = sectionRefs.current[s.id]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/"><Logo size={32} showText /></Link>
        <Link href="/" className={styles.backLink}>← Retour à l'accueil</Link>
      </header>

      <div className={styles.layout}>
        <aside className={styles.toc}>
          <div className={styles.tocSticky}>
            <p className={styles.tocLabel}>Sommaire</p>
            <nav className={styles.tocNav}>
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`${styles.tocLink} ${activeId === s.id ? styles.tocLinkActive : ''}`}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.meta}>
            <span>Mis à jour le {updated}</span>
            <span className={styles.metaDot} />
            <span>{readingMinutes} min de lecture</span>
          </div>

          <div className={styles.essentials}>
            <p className={styles.essentialsTitle}>{essentialsTitle}</p>
            <div className={styles.essentialsGrid}>
              {essentials.map((e, i) => (
                <div key={i} className={styles.essentialItem}>
                  <span className={styles.essentialIcon}>{e.icon}</span>
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          </div>

          {sections.map(s => (
            <section
              key={s.id}
              id={s.id}
              ref={el => { sectionRefs.current[s.id] = el }}
              className={styles.section}
            >
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>{s.icon}</span>
                {s.title}
              </h2>
              {s.content}
            </section>
          ))}

          <div className={styles.footer}>
            <p>Une question sur cette page ? Écrivez à <a href="mailto:privacy@sveltly.fr">privacy@sveltly.fr</a>.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
