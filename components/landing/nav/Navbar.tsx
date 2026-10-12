'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import MegaMenu from './MegaMenu'
import MobileMenu from './MobileMenu'
import AnnouncementBar from './AnnouncementBar'
import { NAV_SECTIONS, NAV_DIRECT_LINK } from '@/lib/navigation'
import { CTA_PRIMARY, CTA_PRIMARY_HREF, CTA_SECONDARY, CTA_SECONDARY_HREF } from '@/lib/brand'
import styles from './Navbar.module.css'

// Délai avant fermeture au survol. Sans lui, traverser le petit espace entre
// le bouton et le panneau suffit à tout refermer — le défaut le plus courant
// des menus déroulants faits à la main.
const CLOSE_DELAY_MS = 140

export default function Navbar() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpenId(null), CLOSE_DELAY_MS)
  }, [cancelClose])

  const openMenu = useCallback((id: string, viaKeyboard = false) => {
    cancelClose()
    setOpenId(id)
    setOpenedByKeyboard(viaKeyboard)
  }, [cancelClose])

  const closeMenu = useCallback(() => {
    cancelClose()
    setOpenId(null)
    setOpenedByKeyboard(false)
  }, [cancelClose])

  useEffect(() => () => cancelClose(), [cancelClose])

  // Un changement de page ferme tout. Sans ça, cliquer sur une entrée de menu
  // laissait le panneau ouvert par-dessus la page qui venait de s'afficher.
  useEffect(() => {
    closeMenu()
    setMobileOpen(false)
  }, [pathname, closeMenu])

  // --- Aspect au défilement -------------------------------------------------
  useEffect(() => {
    let rafId: number | null = null
    function update() {
      rafId = null
      setScrolled(window.scrollY > 10)
    }
    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  // --- Fermeture : Échap, clic extérieur, focus sorti -----------------------
  useEffect(() => {
    if (!openId) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu()
        const trigger = navRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${openId}"]`)
        trigger?.focus()
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) closeMenu()
    }
    function onFocusIn(e: FocusEvent) {
      if (!navRef.current?.contains(e.target as Node)) closeMenu()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [openId, closeMenu])

  function onTriggerKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openMenu(id, true)
    }
  }

  // Un menu est "actif" si la page courante est l'une de ses destinations, ou
  // sa page d'aperçu. C'est ce qui souligne « Produit » quand on lit
  // /produit/agenda.
  function isSectionActive(sectionId: string): boolean {
    const section = NAV_SECTIONS.find(s => s.id === sectionId)
    if (!section) return false
    if (section.overview && pathname === section.overview.href) return true
    return section.links.some(l => pathname === l.href)
  }

  const openSection = NAV_SECTIONS.find(s => s.id === openId) || null

  return (
    <>
      <AnnouncementBar />

      {/* « mkc » porte les tokens --mk-* : la barre vit hors de .mk sur la
          landing, et doit malgré tout partager la palette et le cadre du
          reste du site public. Voir styles/marketing.css. */}
      <header
        ref={navRef}
        className={`mkc ${styles.header} ${scrolled ? styles.scrolled : ''} ${openId ? styles.menuOpen : ''}`}
        onMouseLeave={scheduleClose}
      >
        <nav className={styles.inner} aria-label="Navigation principale">
          <Link href="/" className={styles.brand} aria-label="Sveltly — accueil">
            <Logo size={32} showText priority />
          </Link>

          <ul className={styles.menuList}>
            {NAV_SECTIONS.map(section => {
              const isOpen = openId === section.id
              const isActive = isSectionActive(section.id)
              return (
                <li
                  key={section.id}
                  className={styles.menuItem}
                  onMouseEnter={() => openMenu(section.id)}
                >
                  <button
                    type="button"
                    data-menu-trigger={section.id}
                    className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''} ${isActive ? styles.triggerActive : ''}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={`menu-panel-${section.id}`}
                    onClick={() => (isOpen ? closeMenu() : openMenu(section.id, true))}
                    onKeyDown={e => onTriggerKeyDown(e, section.id)}
                  >
                    {section.label}
                    <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </li>
              )
            })}
            <li className={styles.menuItem}>
              <Link
                href={NAV_DIRECT_LINK.href}
                className={`${styles.trigger} ${pathname === NAV_DIRECT_LINK.href ? styles.triggerActive : ''}`}
                aria-current={pathname === NAV_DIRECT_LINK.href ? 'page' : undefined}
                onMouseEnter={scheduleClose}
              >
                {NAV_DIRECT_LINK.label}
              </Link>
            </li>
          </ul>

          <div className={styles.actions}>
            {/* Les icônes de réseaux sociaux sont descendues dans le pied de
                page : en haut, elles occupaient 126 px à côté de la seule
                action qui compte et emmenaient le visiteur ailleurs au moment
                où on lui demande de s'inscrire. */}
            <Link href={CTA_SECONDARY_HREF} className={styles.login}>{CTA_SECONDARY}</Link>
            <Link href={CTA_PRIMARY_HREF} className={styles.cta}>{CTA_PRIMARY}</Link>
          </div>

          <button
            type="button"
            className={styles.burger}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen(v => !v)}
          >
            <span className={`${styles.burgerBox} ${mobileOpen ? styles.burgerOpen : ''}`} aria-hidden="true">
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
            </span>
          </button>
        </nav>

        <MegaMenu
          section={openSection}
          pathname={pathname}
          autoFocus={openedByKeyboard}
          onRequestClose={closeMenu}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      </header>

      <MobileMenu open={mobileOpen} pathname={pathname} onClose={() => setMobileOpen(false)} />
    </>
  )
}
