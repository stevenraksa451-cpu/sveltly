'use client'
// app/auth/reset-password/page.tsx
// Atteinte via le lien envoyé par /auth/forgot-password. Le client Supabase
// détecte et échange automatiquement le jeton de récupération présent dans
// l'URL (hash #access_token=... ou ?code=..., selon le flux configuré côté
// projet) dès son initialisation — ce composant attend juste la session de
// récupération qui en résulte avant d'afficher le formulaire.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import styles from '../auth.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let settled = false

    // L'URL doit porter un marqueur de récupération (hash #type=recovery de
    // l'ancien flux, ou ?code=... du flux PKCE) — sans ce contrôle, un
    // utilisateur DÉJÀ connecté normalement qui arrivait sur cette page par
    // erreur (lien direct, curiosité) voyait quand même le formulaire
    // s'afficher : getSession() renvoyait sa session ordinaire, confondue à
    // tort avec une session de récupération. Pas une faille de sécurité en
    // soi (il faut déjà être authentifié), mais incorrect : "lien invalide"
    // ne pouvait alors jamais s'afficher pour un compte déjà connecté.
    const hasRecoveryMarker =
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).has('code')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        settled = true
        setReady(true)
      }
    })

    // Filet de sécurité : si le jeton a déjà été échangé avant que ce
    // listener ne soit attaché (le SDK peut le faire dès sa construction),
    // l'event PASSWORD_RECOVERY serait manqué — on vérifie alors la session
    // nous-mêmes, mais UNIQUEMENT si l'URL portait bien un marqueur de
    // récupération au départ.
    const timeout = setTimeout(async () => {
      if (settled) return
      if (hasRecoveryMarker) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          settled = true
          setReady(true)
          return
        }
      }
      setInvalidLink(true)
    }, 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirmPassword) { setError('Les deux mots de passe ne correspondent pas.'); return }

    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Mot de passe mis à jour</h1>
          <p className={styles.subtitle}>Redirection vers votre tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (invalidLink) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logoWrap}><Logo size={46} showText /></div>
          <h1 className={styles.title}>Lien invalide ou expiré</h1>
          <p className={styles.subtitle}>
            Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau.
          </p>
          <Link href="/auth/forgot-password" className={styles.submitBtn} style={{ textAlign: 'center', display: 'block', marginTop: 16 }}>
            Redemander un lien
          </Link>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logoWrap}><Logo size={46} animated showText /></div>
          <p className={styles.subtitle} style={{ marginBottom: 0 }}>Vérification du lien...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo size={46} showText />
        </div>
        <h1 className={styles.title}>Choisissez un nouveau mot de passe</h1>
        <p className={styles.subtitle}>Au moins 8 caractères.</p>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Nouveau mot de passe</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirmer le mot de passe</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
