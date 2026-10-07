'use client'
// app/auth/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      // Toujours le même message, succès ou email inconnu — ne jamais
      // révéler si une adresse est associée à un compte (énumération).
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✉</div>
          <h1 className={styles.title}>Vérifiez votre email</h1>
          <p className={styles.subtitle}>
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de lui être envoyé.
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
        <h1 className={styles.title}>Mot de passe oublié</h1>
        <p className={styles.subtitle}>
          Indiquez votre email, nous vous envoyons un lien pour en choisir un nouveau.
        </p>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="vous@entreprise.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <p className={styles.switchText}>
          <Link href="/auth/login" className={styles.switchLink}>Retour à la connexion</Link>
        </p>
      </div>
    </div>
  )
}
