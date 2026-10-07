'use client'
// hooks/useRequireAuth.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useRequireAuth() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (!session) {
        router.push('/auth/login')
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth/login')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])
}