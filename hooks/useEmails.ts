// hooks/useEmails.ts
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { Email } from '@/types'

async function fetchEmails(): Promise<Email[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const res = await fetch('/api/emails', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  if (!res.ok) throw new Error('Erreur de récupération des emails')
  const data = await res.json()
  return data.emails || []
}

export function useEmails() {
  // <Email[]> explicite : sans lui, le type de retour de fetchEmails (déjà
  // Promise<Email[]>) se faisait quand même élargir en `any` par useSWR dans
  // ce fichier — ce qui, plus loin, faisait tomber l'inférence générique de
  // getEmailsReceivedToday() sur sa seule contrainte ({ receivedAt: string })
  // au lieu du vrai type Email (voir app/(app)/dashboard/page.tsx).
  const { data, error, isLoading, mutate } = useSWR<Email[]>('emails', fetchEmails, {
    revalidateOnFocus: false, // évite de re-fetch à chaque fois que l'onglet reprend le focus
    dedupingInterval: 60000,  // ne redemande pas deux fois en moins d'1 min, même entre pages différentes
    refreshInterval: 60000,   // revalide automatiquement toutes les minutes, tant qu'une page qui utilise ce hook est affichée
  })

  return {
    emails: data || [],
    loading: isLoading,
    error,
    refresh: mutate, // permet de forcer un rafraîchissement manuel (ex: après une action)
  }
}
