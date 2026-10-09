// hooks/useEmails.ts
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { Email } from '@/types'
import { timed } from '@/lib/perf'

// Chronométrée : c'est l'action la plus lourde du produit (Gmail + analyse
// Groq) et celle dont la lenteur se voit le plus. Voir lib/perf.ts.
async function fetchEmails(): Promise<Email[]> {
  return timed('emails.sync', fetchEmailsInner)
}

async function fetchEmailsInner(): Promise<Email[]> {
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
    dedupingInterval: 4000,   // assez court pour laisser passer le polling rapide ci-dessous tant que l'IA travaille encore
    // GET /api/emails répond maintenant dès le fetch Gmail terminé, avant que
    // l'analyse IA (lancée en arrière-plan côté serveur, voir after() dans
    // app/api/emails/route.ts) soit forcément finie — tant qu'il reste des
    // emails 'pending', on repasse toutes les 4s pour récupérer les résumés/
    // réponses au fur et à mesure plutôt que d'attendre jusqu'à 60s à chaque
    // fois. Dès que tout est 'done', on retombe sur un polling normal.
    refreshInterval: (latestData) => {
      const hasPending = (latestData || []).some(e => e.analysisStatus === 'pending')
      return hasPending ? 4000 : 60000
    },
  })

  return {
    emails: data || [],
    loading: isLoading,
    error,
    refresh: mutate, // permet de forcer un rafraîchissement manuel (ex: après une action)
  }
}
