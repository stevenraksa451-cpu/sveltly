'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toggleMobileSidebar } from '@/lib/mobileSidebar'
import SearchPalette from './SearchPalette'
import styles from './Header.module.css'

interface HeaderProps {
  title: string
  subtitle?: React.ReactNode
  hideTitle?: boolean
}

export default function Header({ title, subtitle, hideTitle }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  // SearchPalette charge useEmails/useTasks/useCalendarEvents dès qu'elle est
  // montée — et Header (donc ce composant) est présent sur CHAQUE page
  // connectée. Sans ce garde, ouvrir /settings ou /help déclenchait ces 3
  // fetches juste pour garder Cmd+K "prêt", même si personne ne l'utilise.
  // On ne monte la palette qu'à la toute première ouverture, puis elle le
  // reste (réouvertures suivantes instantanées, pas de re-fetch à chaque fois).
  const [searchMounted, setSearchMounted] = useState(false)

  function openSearch() {
    setSearchMounted(true)
    setSearchOpen(true)
  }

  // Cmd+K (Mac) / Ctrl+K (Windows-Linux) ouvre la recherche depuis n'importe
  // quelle page connectée — Header est monté sur toutes via AppLayout.
  //
  // `/` l'ouvre aussi, convention des outils au clavier (Gmail, GitHub,
  // Superhuman). La recherche vivant ici et non dans la boîte de réception,
  // ce raccourci est posé ICI plutôt que dans useRaccourcis : le dupliquer
  // donnerait deux écouteurs qui ouvrent la même palette.
  //
  // ⚠️ `/` ne doit PAS être capté depuis un champ de saisie — sinon il
  // devient impossible d'écrire une date ou une URL dans le brouillon de
  // réponse. Ctrl+K, lui, est capté partout : il sert justement à quitter ce
  // qu'on est en train de faire.
  useEffect(() => {
    function dansUnChamp(cible: EventTarget | null): boolean {
      const el = cible as HTMLElement | null
      if (!el || !el.tagName) return false
      const t = el.tagName.toUpperCase()
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
        return
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !dansUnChamp(e.target)) {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className={styles.header}>
      {/* Même cadre que <main> (AppLayout.module.css) : sans ce calage, le
          titre et les actions de la barre flottaient au bord de l'écran
          pendant que le contenu de la page restait centré sous elles. */}
      <div className={styles.inner}>
      <div className={styles.leftRow}>
        {/* Visible uniquement sous 768px (voir .menuBtn) — ouvre le tiroir
            de Sidebar, montée séparément par app/(app)/layout.tsx. */}
        <button className={`${styles.iconBtn} ${styles.menuBtn}`} onClick={toggleMobileSidebar} title="Menu" aria-label="Ouvrir le menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className={styles.left}>
          {/* hideTitle : reste dans le DOM pour l'onglet du navigateur et les
              lecteurs d'écran, mais invisible à l'écran — évite un doublon
              avec un titre déjà affiché par la page elle-même. */}
          <h1 className={hideTitle ? 'sr-only' : styles.title}>{title}</h1>
          {/* Toujours rendu dès que la page déclare un sous-titre, même vide :
              il arrive après le chargement sur Agenda et Réglages, et le titre
              sautait vers le haut au moment où il apparaissait. */}
          {subtitle !== undefined && (
            <p className={styles.subtitle}>{subtitle || ' '}</p>
          )}
        </div>
      </div>

      <div className={styles.right}>
        {/* Déclencheur de recherche. Présenté comme un champ et non comme une
            icône seule : la barre comportait près de 900 px de vide à sa
            droite, et rien n'indiquait que la recherche existait ni qu'elle
            avait un raccourci. Le vrai champ est dans SearchPalette — ce
            bouton l'ouvre. Sous 900 px, il se réduit à l'icône (voir CSS). */}
        <button className={styles.search} onClick={openSearch} aria-label="Rechercher">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className={styles.searchLabel}>Rechercher</span>
          <kbd className={styles.kbd}>Ctrl K</kbd>
        </button>

        {/* Paramètres */}
        <Link href="/settings" className={styles.iconBtn} title="Paramètres">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>

      </div>

      {searchMounted && <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  )
}