'use client'
// app/onboarding/name/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import styles from '../onboarding.module.css'

export default function OnboardingNamePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!name.trim()) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setLoading(false); return }

    await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name.trim(),
    })

    router.push('/onboarding/features')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Logo size={46} showText />

        <div className={styles.progress}>
          <span className={styles.progressDotActive} />
          <span className={styles.progressDot} />
        </div>

        <h1 className={styles.title}>Comment souhaitez-vous qu'on vous appelle ?</h1>
        <p className={styles.subtitle}>
          On utilisera ce prénom pour personnaliser votre tableau de bord.
        </p>

        <input
          className={styles.input}
          placeholder="Votre prénom"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleContinue()}
          autoFocus
        />

        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={!name.trim() || loading}
        >
          {loading ? 'Un instant...' : 'Continuer'}
        </button>
      </div>
    </div>
  )
}