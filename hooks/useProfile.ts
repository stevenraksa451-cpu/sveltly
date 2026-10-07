// hooks/useProfile.ts
// Source unique et partagée du profil utilisateur (public.profiles) — avant
// ce hook, Sidebar, NotificationManager, le layout (app)/* (synchro du
// thème), PlanCards et la page Réglages faisaient CHACUN leur propre requête
// profiles séparée, à chaque montage, sans aucun cache ni partage entre eux.
// Résultat : revisiter Réglages, ou simplement naviguer entre deux pages qui
// montent ces composants, redéclenchait systématiquement plusieurs
// allers-retours réseau identiques pour la même ligne de profil. useSWR fait
// qu'un seul fetch réel est effectué par fenêtre de dédoublonnage, peu importe
// le nombre de composants qui appellent useProfile() en même temps.
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

export async function fetchProfile() {
  // getSession() (pas getUser()) : lu depuis la session déjà en mémoire,
  // aucun aller-retour réseau supplémentaire juste pour obtenir l'id.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('profile', fetchProfile, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  return {
    profile: data ?? null,
    loading: isLoading,
    error,
    // À appeler après un supabase.from('profiles').update(...) réussi,
    // pour que tous les consommateurs de ce cache (Sidebar, NotificationManager,
    // le layout, Réglages...) reflètent immédiatement le changement sans
    // attendre la prochaine fenêtre de dédoublonnage.
    refresh: mutate,
  }
}
