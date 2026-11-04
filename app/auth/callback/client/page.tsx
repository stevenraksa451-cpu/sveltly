'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CallbackClient() {
  const router = useRouter()

  useEffect(() => {
    async function handle() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.provider_token) {
        // Jamais loggé : providerToken/refreshToken sont des jetons d'accès
        // Gmail bruts, les exposer dans la console serait une fuite inutile.
        const res = await fetch('/api/save-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: session.access_token,
            providerToken: session.provider_token,
            refreshToken: session.provider_refresh_token || null,
          })
        })
        if (!res.ok) console.error('Échec de l\'enregistrement de la connexion Gmail')
      }
      router.push('/dashboard')
    }
    handle()
    // `router` est stable entre les rendus dans l'App Router : l'ajouter ne
    // relance rien, et évite d'avoir à faire taire la règle. Un tableau de
    // dépendances incomplet qu'on ignore une fois finit par en cacher un
    // deuxième, celui qui comptait vraiment.
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Connexion en cours</p>
    </div>
  )
}