'use client'
// app/auth/register/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import styles from '../auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✉</div>
          <h1 className={styles.title}>Vérifiez votre email</h1>
          <p className={styles.subtitle}>
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link href="/auth/login" className={styles.submitBtn} style={{ textAlign: 'center', display: 'block', marginTop: 16 }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size={46} animated showText />
        </div>
        <h1 className={styles.title}>Créer un compte</h1>
        <p className={styles.subtitle}>Commencez à gérer vos emails intelligemment</p>

        <button className={styles.oauthBtn} onClick={handleGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>
        <div className={styles.divider}><span>ou</span></div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Nom complet</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Prénom Nom"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email professionnel</label>
            <input
              type="email"
              className={styles.input}
              placeholder="prenom.nom@entreprise.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mot de passe</label>
            <input
              type="password"
              className={styles.input}
              placeholder="8 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte gratuitement'}
          </button>
        </form>
        <p className={styles.terms}>
          En créant un compte, vous acceptez nos{' '}
          <Link href="/legal/terms">CGU</Link> et notre <Link href="/legal/privacy">politique de confidentialité</Link>.
        </p>
        <p className={styles.switchText}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" className={styles.switchLink}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}