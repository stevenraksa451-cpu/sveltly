'use client'
// app/onboarding/features/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import Brand from '@/components/ui/Brand'
import { supabase } from '@/lib/supabase'
import styles from './features.module.css'

const FEATURES = [
  {
    id: 'inbox',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/>
      </svg>
    ),
    title: 'Boîte mail intelligente',
    desc: 'Chaque email reçu est classé automatiquement par priorité — urgent, important, ou normal — dès son arrivée. Fini de tout ouvrir un par un pour savoir ce qui compte.',
  },
  {
    id: 'replies',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Réponses rédigées pour vous',
    desc: <><Brand /> rédige un brouillon complet pour chaque email, prêt à envoyer. Vous relisez, vous ajustez si besoin, vous validez — rien ne part jamais sans votre accord.</>,
  },
  {
    id: 'calendar',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
    title: 'Agenda automatique',
    desc: <>Un rendez-vous mentionné dans un email ? <Brand /> le détecte et l'ajoute directement à votre agenda, sans que vous ayez à le faire vous-même.</>,
  },
]

export default function OnboardingFeaturesPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)

  async function markOnboarded() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) {
      await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id)
    }
  }

  async function handleConnect(featureId: string) {
    setConnecting(true)
    await markOnboarded()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
        ].join(' '),
      }
    })
  }

  async function handleSkip() {
    await markOnboarded()
    router.push('/dashboard')
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>

        <div className={styles.head}>
          <Logo size={40} showText />
          <div className={styles.progress}>
            <span className={styles.progressDotDone} />
            <span className={styles.progressDotActive} />
          </div>
          <h1 className={styles.title}>Voici ce que <Brand /> fait pour vous</h1>
          <p className={styles.subtitle}>
            Chaque fonctionnalité s'active en connectant votre Gmail — vous choisissez si et quand.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map(f => (
            <div key={f.id} className={styles.card}>
              <div className={styles.cardIcon}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>

              <button
                className={`${styles.cardBtn} ${connected ? styles.cardBtnConnected : ''}`}
                onClick={() => handleConnect(f.id)}
                disabled={connecting || connected}
              >
                {connected ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Connecté
                  </>
                ) : connecting ? (
                  'Connexion...'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Connecter Gmail
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <p className={styles.trustNote}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          Rien n'est envoyé automatiquement, et vous pouvez révoquer l'accès à tout moment depuis les paramètres.
        </p>

        <div className={styles.footer}>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Continuer sans connecter maintenant
          </button>
        </div>

      </div>
    </div>
  )
}