'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Icon from '@/components/marketing/Icon'
import { PRODUCT_FEATURE_CARD } from './navConfig'
import type { NavSection } from '@/lib/navigation'
import styles from './MegaMenu.module.css'

export default function MegaMenu({
  section, pathname, autoFocus, onRequestClose, onMouseEnter, onMouseLeave,
}: {
  section: NavSection | null
  pathname: string
  autoFocus: boolean
  onRequestClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Ouverture au clavier : le focus entre dans le panneau, sinon Tab
  // continuerait vers le bouton suivant en laissant derrière lui un panneau
  // ouvert et inatteignable.
  useEffect(() => {
    if (!section || !autoFocus) return
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
  }, [section, autoFocus])

  // Le conteneur reste monté en permanence : c'est lui qui porte la
  // transition. Le démonter supprimerait l'animation de sortie, et le
  // remonter à chaque survol ferait clignoter le passage d'un menu à l'autre.
  return (
    <div
      className={`${styles.wrap} ${section ? styles.open : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!section}
      inert={!section}
    >
      <div
        ref={panelRef}
        id={section ? `menu-panel-${section.id}` : undefined}
        className={`${styles.panel} ${section?.layout === 'mega' ? styles.panelMega : styles.panelList}`}
      >
        {section && (
          <>
            <div
              className={`${styles.entries} ${
                section.layout === 'mega' ? styles.entriesMega
                  : section.columns === 2 ? styles.entriesTwoCols
                  : styles.entriesOneCol
              }`}
            >
              {section.links.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.entry} ${pathname === link.href ? styles.entryActive : ''}`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  onClick={onRequestClose}
                >
                  {/* Cascade très légère : l'index pilote le retard, borné pour
                      que la dernière entrée n'attende pas une éternité. */}
                  <span className={styles.entryInner} style={{ '--i': Math.min(i, 7) } as React.CSSProperties}>
                    <span className={styles.entryIcon} aria-hidden="true"><Icon name={link.icon} /></span>
                    <span className={styles.entryText}>
                      <span className={styles.entryLabel}>
                        {link.label}
                        {link.tag && <span className={styles.entryTag}>{link.tag}</span>}
                      </span>
                      <span className={styles.entryDesc}>{link.desc}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            {section.layout === 'mega' && (
              <Link href={PRODUCT_FEATURE_CARD.href} className={styles.featureCard} onClick={onRequestClose}>
                <span className={styles.featureEyebrow}>{PRODUCT_FEATURE_CARD.eyebrow}</span>
                <span className={styles.featureTitle}>{PRODUCT_FEATURE_CARD.title}</span>
                <span className={styles.featureDesc}>{PRODUCT_FEATURE_CARD.desc}</span>

                <span className={styles.featureMock} aria-hidden="true">
                  <span className={`${styles.mockRow} ${styles.mockUrgent}`}>
                    <span className={styles.mockDot} />
                    <span className={styles.mockBarWide} />
                  </span>
                  <span className={`${styles.mockRow} ${styles.mockImportant}`}>
                    <span className={styles.mockDot} />
                    <span className={styles.mockBarMid} />
                  </span>
                  <span className={styles.mockRow}>
                    <span className={styles.mockDot} />
                    <span className={styles.mockBarNarrow} />
                  </span>
                </span>

                <span className={styles.featureLink}>
                  {PRODUCT_FEATURE_CARD.linkLabel}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            )}

            {section.overview && section.layout !== 'mega' && (
              <div className={styles.panelFooter}>
                <Link href={section.overview.href} className={styles.panelFooterLink} onClick={onRequestClose}>
                  {section.overview.label}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
