'use client'
// components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Logo from '@/components/ui/Logo'
import Avatar from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { setMobileSidebarOpen, subscribeMobileSidebar } from '@/lib/mobileSidebar'
import styles from './Sidebar.module.css'

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg> },
  { href: '/inbox', label: 'Boîte de réception', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg> },
  {
    href: '/tasks',
    label: 'Tâches',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    )
  },
  { href: '/calendar', label: 'Agenda', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
]

const NAV_BOTTOM = [
  { href: '/settings', label: 'Paramètres', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  { href: '/help', label: 'Aide', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
]

const WIDTH_EXPANDED = '256px'
const WIDTH_COLLAPSED = '76px'

// Chaque entrée pointe vers un onglet de la page unique /settings via ?tab=
const MENU_ITEMS = [
  {
    href: '/settings?tab=account',
    label: 'Profil',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>,
  },
  {
    href: '/settings?tab=appearance',
    label: 'Personnalisation',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9-10-9z"/></svg>,
  },
  {
    href: '/settings?tab=billing',
    label: 'Changer de forfait',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  },
  {
    href: '/settings',
    label: 'Tous les paramètres',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
  {
    href: '/help',
    label: 'Aide',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('Mon compte')
  const [userEmail, setUserEmail] = useState('')
  const [initials, setInitials] = useState('?')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number; width: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const profileBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    const isCollapsed = saved === 'true'
    setCollapsed(isCollapsed)
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
    )
  }, [])

  // Tiroir mobile (< 768px) : ouvert/fermé depuis le bouton hamburger du
  // Header (frère, pas parent — voir lib/mobileSidebar.ts), et toujours
  // refermé automatiquement après un changement de page.
  useEffect(() => subscribeMobileSidebar(setMobileOpen), [])
  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      document.documentElement.style.setProperty(
        '--sidebar-width',
        next ? WIDTH_COLLAPSED : WIDTH_EXPANDED
      )
      return next
    })
  }

  useEffect(() => {
    // getSession() (pas getUser()) : Sidebar est montée sur CHAQUE page de
    // l'espace connecté — un round-trip réseau ici à chaque navigation,
    // juste pour afficher le nom/avatar, pèse sur la lenteur ressentie sur
    // l'app entière. La session déjà en mémoire suffit, sans aller-retour.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      const name = user.user_metadata?.full_name || user.email || 'Mon compte'
      setUserName(name)
      setUserEmail(user.email || '')
      setAvatarUrl(user.user_metadata?.avatar_url || null)
      const parts = name.split(' ')
      setInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase())
    })
  }, [])

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  // Le menu est positionné en fixed (calculé depuis le bouton) plutôt qu'en
  // absolute dans .profileWrap : .sidebar a overflow:hidden, donc un menu
  // ancré en absolute s'y fait couper dès qu'il dépasse la largeur réduite
  // du mode replié (76px).
  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    const btn = profileBtnRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setMenuPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        width: collapsed ? 220 : rect.width,
      })
    }
    setMenuOpen(true)
  }

  const firstName = userName.split(' ')[0]
  // Sur le tiroir mobile, l'état "réduit" du rail desktop n'a pas de sens
  // (l'espace n'est pas contraint dans un panneau qui recouvre l'écran) —
  // on affiche toujours la version dépliée tant que le tiroir est ouvert.
  const showExpanded = !collapsed || mobileOpen

  return (
    <>
      {mobileOpen && <div className={styles.backdrop} onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
      <div className={styles.header}>
        <Logo size={34} showText={showExpanded} />
        <button
          className={styles.toggleBtn}
          onClick={toggleCollapsed}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${pathname.startsWith(href) ? styles.active : ''}`}
            title={!showExpanded ? label : undefined}
          >
            <span className={styles.icon}>{icon}</span>
            {showExpanded && label}
          </Link>
        ))}

        <div className={styles.divider} />

        {NAV_BOTTOM.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${pathname.startsWith(href) ? styles.active : ''}`}
            title={!showExpanded ? label : undefined}
          >
            <span className={styles.icon}>{icon}</span>
            {showExpanded && label}
          </Link>
        ))}
      </nav>

      <div className={styles.profileWrap} ref={menuRef}>
        {menuOpen && menuPos && (
          <div
            className={styles.profileMenu}
            style={{ left: menuPos.left, bottom: menuPos.bottom, width: menuPos.width }}
          >
            {MENU_ITEMS.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={styles.menuItem}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.menuItemIcon}>{icon}</span>
                {label}
              </Link>
            ))}
            <div className={styles.menuDivider} />
            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleLogout}>
              <span className={styles.menuItemIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              Se déconnecter
            </button>
          </div>
        )}

        <button className={styles.profileCard} ref={profileBtnRef} onClick={toggleMenu} title="Mon compte">
          <Avatar src={avatarUrl} initials={initials} size={34} />
          {showExpanded && (
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{firstName}</p>
              <p className={styles.profileEmail}>{userEmail}</p>
            </div>
          )}
          {showExpanded && (
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          )}
        </button>
      </div>
      </aside>
    </>
  )
}