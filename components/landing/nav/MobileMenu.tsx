'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/marketing/Icon'
import { NAV_SECTIONS, NAV_DIRECT_LINK } from '@/lib/navigation'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_SECONDARY, CTA_SECONDARY_HREF } from '@/lib/brand'
import styles from './MobileMenu.module.css'

export default function MobileMenu({
  open, pathname, onClose,
}: {
  open: boolean
  pathname: string
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Verrouille le défilement de la page derrière le panneau. On restaure la
  // valeur précédente plutôt que d'écrire 'auto' en dur, pour ne pas écraser
  // un overflow défini ailleurs.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // À l'ouverture, déplie la section correspondant à la page courante : on
  // arrive directement sur son contexte au lieu d'un panneau entièrement
  // replié. À la fermeture, tout se referme.
  useEffect(() => {
    if (!open) { setExpanded(null); return }
    const current = NAV_SECTIONS.find(s =>
      s.links.some(l => l.href === pathname) || s.overview?.href === pathname
    )
    setExpanded(current?.id ?? null)
  }, [open, pathname])

  return (
    <div id="mobile-menu" className={`mkc ${styles.sheet} ${open ? styles.open : ''}`} aria-hidden={!open} inert={!open}>
      <div className={styles.scroll}>
        {NAV_SECTIONS.map(section => {
          const isExpanded = expanded === section.id
          return (
            <div key={section.id} className={styles.group}>
              <button
                type="button"
                className={styles.groupTrigger}
                aria-expanded={isExpanded}
                aria-controls={`mobile-group-${section.id}`}
                onClick={() => setExpanded(isExpanded ? null : section.id)}
              >
                {section.label}
                <svg
                  className={`${styles.groupChevron} ${isExpanded ? styles.groupChevronOpen : ''}`}
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* grid-template-rows 0fr → 1fr : anime une hauteur inconnue sans
                  la mesurer en JS, et sans max-height arbitraire qui
                  tronquerait un contenu plus long que prévu. */}
              <div
                id={`mobile-group-${section.id}`}
                className={`${styles.groupPanel} ${isExpanded ? styles.groupPanelOpen : ''}`}
              >
                <div className={styles.groupPanelInner}>
                  {section.overview && (
                    <Link
                      href={section.overview.href}
                      className={styles.overviewLink}
                      onClick={onClose}
                      aria-current={pathname === section.overview.href ? 'page' : undefined}
                    >
                      {section.overview.label}
                    </Link>
                  )}
                  {section.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${styles.entry} ${pathname === link.href ? styles.entryActive : ''}`}
                      aria-current={pathname === link.href ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <span className={styles.entryIcon} aria-hidden="true"><Icon name={link.icon} /></span>
                      <span className={styles.entryText}>
                        <span className={styles.entryLabel}>
                          {link.label}
                          {link.tag && <span className={styles.entryTag}>{link.tag}</span>}
                        </span>
                        <span className={styles.entryDesc}>{link.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        <Link
          href={NAV_DIRECT_LINK.href}
          className={`${styles.directLink} ${pathname === NAV_DIRECT_LINK.href ? styles.directLinkActive : ''}`}
          onClick={onClose}
        >
          {NAV_DIRECT_LINK.label}
        </Link>
      </div>

      <div className={styles.footer}>
        <Link href={CTA_SECONDARY_HREF} className={styles.footerLogin} onClick={onClose}>{CTA_SECONDARY}</Link>
        <Link href={CTA_PRIMARY_HREF} className={styles.footerCta} onClick={onClose}>{CTA_PRIMARY}</Link>
      </div>
    </div>
  )
}
