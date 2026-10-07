'use client'
import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { toggleMobileSidebar } from '@/lib/mobileSidebar'
import SearchPalette from './SearchPalette'
import styles from './Header.module.css'

interface HeaderProps {
  title: string
  subtitle?: React.ReactNode
  hideTitle?: boolean
}

export default function Header({ title, subtitle, hideTitle }: HeaderProps) {
  const { theme, changeTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  // SearchPalette charge useEmails/useTasks/useCalendarEvents dès qu'elle est
  // montée — et Header (donc ce composant) est présent sur CHAQUE page
  // connectée. Sans ce garde, ouvrir /settings ou /help déclenchait ces 3
  // fetches juste pour garder Cmd+K "prêt", même si personne ne l'utilise.
  // On ne monte la palette qu'à la toute première ouverture, puis elle le
  // reste (réouvertures suivantes instantanées, pas de re-fetch à chaque fois).
  const [searchMounted, setSearchMounted] = useState(false)

  function toggleTheme() {
    changeTheme(theme === 'dark' ? 'light' : 'dark')
  }

  function openSearch() {
    setSearchMounted(true)
    setSearchOpen(true)
  }

  // Cmd+K (Mac) / Ctrl+K (Windows-Linux) ouvre la recherche depuis n'importe
  // quelle page connectée — Header est monté sur toutes via AppLayout.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.leftRow}>
        {/* Visible uniquement sous 768px (voir .menuBtn) — ouvre le tiroir
            de Sidebar, montée séparément par app/(app)/layout.tsx. */}
        <button className={`${styles.iconBtn} ${styles.menuBtn}`} onClick={toggleMobileSidebar} title="Menu" aria-label="Ouvrir le menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className={styles.left}>
          {/* hideTitle : reste dans le DOM pour l'onglet du navigateur et les
              lecteurs d'écran, mais invisible à l'écran — évite un doublon
              avec un titre déjà affiché par la page elle-même. */}
          <h1 className={hideTitle ? 'sr-only' : styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.right}>
        {/* Recherche */}
        <button className={styles.iconBtn} title="Rechercher (Ctrl+K)" onClick={openSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>

        {/* Thème */}
        <button className={styles.iconBtn} onClick={toggleTheme} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Paramètres */}
        <a href="/settings" className={styles.iconBtn} title="Paramètres">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </a>
      </div>

      {searchMounted && <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  )
}