'use client'
import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { Theme, THEME_STORAGE_KEY, applyTheme, getStoredTheme } from '@/lib/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  // Cache partagé (voir hooks/useProfile.ts) — ce hook est utilisé sur les
  // pages Réglages, qui montent aussi Sidebar/NotificationManager/le layout ;
  // avant, chacun refaisait sa propre requête profiles pour la même ligne à
  // chaque visite. useProfile() ne fetch qu'une fois par fenêtre de
  // dédoublonnage, peu importe combien de composants l'utilisent à la fois.
  const { profile, refresh } = useProfile()

  useEffect(() => {
    const saved = getStoredTheme()
    setTheme(saved)
    applyTheme(saved)
  }, [])

  // Resynchronise depuis profiles.theme — localStorage ne reflète pas un
  // thème choisi sur un autre appareil. Sans ça, le sélecteur de thème dans
  // Réglages pouvait afficher "Clair" sélectionné alors que le profil dit
  // "Sombre". Effet séparé (pas dans celui au-dessus) : profile arrive de
  // façon asynchrone via useProfile(), après le rendu initial.
  useEffect(() => {
    const dbTheme = profile?.theme as Theme | undefined
    if (!dbTheme || dbTheme === getStoredTheme()) return
    setTheme(dbTheme)
    localStorage.setItem(THEME_STORAGE_KEY, dbTheme)
    applyTheme(dbTheme)
  }, [profile?.theme])

  // BUG corrigé ici : changer de page remontait un NOUVEAU useTheme() (Header
  // est remonté par chaque <AppLayout>, pas partagé) dont le second effet
  // ci-dessus relit profile.theme — qui restait sur l'ANCIENNE valeur dans le
  // cache partagé de useProfile() (dedupingInterval 30s) tant que personne ne
  // le rafraîchissait. Résultat : la page suivante "resynchronisait" en
  // écrasant le thème qu'on venait tout juste de choisir. Les deux lignes
  // ajoutées ici — mutation optimiste du cache SWR + écriture en base —
  // préviennent ça pour TOUS les appelants (bascule rapide du Header, page
  // Réglages, page Personnalisation) au lieu de ne réparer qu'un seul endroit.
  function changeTheme(t: Theme) {
    setTheme(t)
    localStorage.setItem(THEME_STORAGE_KEY, t)
    applyTheme(t)
    refresh((current: any) => current ? { ...current, theme: t } : current, { revalidate: false })
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (user) supabase.from('profiles').update({ theme: t }).eq('id', user.id)
    })
  }

  return { theme, changeTheme }
}
