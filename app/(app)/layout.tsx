'use client'
// app/(app)/layout.tsx
import { useEffect, useLayoutEffect } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useProfile } from '@/hooks/useProfile'
import Sidebar from '@/components/layout/Sidebar'
import NotificationManager from '@/components/NotificationManager'
import { applyTheme, getStoredTheme, resetTheme, THEME_STORAGE_KEY, Theme } from '@/lib/theme'
import styles from './app-layout.module.css'

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth()
  // Cache partagé (voir hooks/useProfile.ts) — ce layout ne remonte pas à
  // chaque navigation entre pages connectées (seul `children` change), donc
  // ce fetch ne se refait déjà qu'une fois par session dans la plupart des
  // cas ; le partager avec Sidebar/NotificationManager/Réglages évite quand
  // même un fetch profiles en double au tout premier chargement de l'app.
  const { profile } = useProfile()

  // Le thème sombre ne doit exister que dans l'espace connecté : on l'applique
  // en entrant ici (y compris en navigation client sans rechargement complet)
  // et on le remet en clair en sortant, pour ne jamais l'exposer sur la landing.
  // useLayoutEffect (pas useEffect) : s'exécute avant la peinture du navigateur,
  // pour éviter un flash clair→sombre lors de la toute première entrée dans l'app.
  useLayoutEffect(() => {
    applyTheme(getStoredTheme())
    return () => resetTheme()
  }, [])

  // Resynchronise depuis profiles.theme (la vraie préférence sauvegardée par
  // l'utilisateur) — localStorage est propre à CET appareil/navigateur, donc
  // un thème choisi ailleurs n'y apparaît jamais : sans ce correctif, un
  // utilisateur qui passe en sombre sur un appareil revoyait toujours le
  // thème clair par défaut sur un autre, malgré la préférence "enregistrée".
  // useEffect normal (pas useLayoutEffect) : ne doit pas retarder la
  // première peinture, seulement corriger après coup si la base diverge.
  useEffect(() => {
    const dbTheme = profile?.theme as Theme | undefined
    if (!dbTheme || dbTheme === getStoredTheme()) return
    localStorage.setItem(THEME_STORAGE_KEY, dbTheme)
    applyTheme(dbTheme)
  }, [profile?.theme])

  return (
    <div className={styles.layout}>
      <Sidebar />
      <NotificationManager />
      <div className={styles.main}>
        <div className={styles.pageGlow} aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
