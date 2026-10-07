// components/NotificationManager.tsx
'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'

export default function NotificationManager() {
  const permissionAsked = useRef(false)
  // Le profil vient du cache partagé (voir hooks/useProfile.ts) — avant,
  // ce composant (monté sur chaque page connectée) faisait sa propre requête
  // profiles à chaque montage, en plus de celles de Sidebar/layout/Réglages
  // pour la MÊME ligne. useProfile() ne déclenche un vrai fetch qu'une seule
  // fois par fenêtre de dédoublonnage, quel que soit le nombre de composants
  // qui l'utilisent simultanément.
  const { profile, loading: profileLoading } = useProfile()

  useEffect(() => {
    // `setup()` est asynchrone (plusieurs `await` avant la création du channel).
    // En Strict Mode (dev), React monte/nettoie/remonte l'effet de façon synchrone :
    // le cleanup peut donc s'exécuter avant que `channel` ne soit assigné, et la
    // suite de `setup()` continue en arrière-plan après ce cleanup. `cancelled`
    // empêche cette exécution "fantôme" de créer/souscrire un channel après coup.
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      if (profileLoading) return
      // getSession() : uniquement pour l'id (nécessaire au nom/filtre du
      // channel realtime) — ne coûte rien, lu depuis la session déjà en
      // mémoire, pas un second aller-retour réseau.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || cancelled) return

      if (cancelled || !profile?.notifs_enabled) return

      // Demande la permission une seule fois, sur interaction déjà en cours
      if (!permissionAsked.current && Notification.permission === 'default') {
        permissionAsked.current = true
        await Notification.requestPermission()
      }
      if (cancelled || Notification.permission !== 'granted') return

      // Channel nommé par utilisateur pour éviter toute collision entre sessions
      // (ex: changement de compte sans rechargement complet).
      const channelName = `email-notifications-${user.id}`

      // Filet de sécurité : si un channel du même topic existe déjà (double montage
      // Strict Mode, Fast Refresh, cleanup précédent manqué), on le retire proprement
      // avant d'en recréer un — `supabase.channel()` réutilise sinon l'objet existant
      // déjà `subscribe()`, sur lequel `.on()` échoue.
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
      if (stale) await supabase.removeChannel(stale)
      if (cancelled) return

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'emails', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const email = payload.new as { priority: string; sender: string; subject: string; daily_summary?: string }

            if (profile.urgent_only_notifs && email.priority !== 'urgent') return
            if (email.priority !== 'urgent' && email.priority !== 'important') return

            new Notification(`${email.priority === 'urgent' ? ' Urgent' : ' Important'} — ${email.sender}`, {
              body: email.daily_summary || email.subject,
              icon: '/favicon.ico',
              tag: `email-${payload.new.id}`,
            })
          }
        )
        .subscribe()
    }

    setup()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
    // Se relance une fois le profil effectivement chargé (profileLoading
    // passe de true à false) — sur le premier rendu, useProfile() n'a pas
    // encore de donnée, setup() ressort donc immédiatement sans rien faire.
  }, [profileLoading, profile?.notifs_enabled, profile?.urgent_only_notifs])

  return null
}