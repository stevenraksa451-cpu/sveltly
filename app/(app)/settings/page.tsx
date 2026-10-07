'use client'
// app/settings/page.tsx
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Avatar from '@/components/ui/Avatar'
import UsageLimitCard from '@/components/ui/UsageLimitCard'
import Brand from '@/components/ui/Brand'
import PlanCards from '@/components/settings/PlanCards'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { useProfile } from '@/hooks/useProfile'
import { getPlan } from '@/lib/plans'
import { TONES, TONE_LABEL, TONE_EXAMPLE, REPLY_LANGUAGES, REPLY_LANGUAGE_LABEL, REPLY_LANGUAGE_DESC, ReplyLanguage } from '@/lib/tone'
import styles from './settings.module.css'

const TABS: { id: string; label: string; icon: JSX.Element; danger?: boolean }[] = [
  { id: 'account', label: 'Compte', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg> },
  { id: 'mailboxes', label: 'Boîtes mail', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg> },
  { id: 'ai', label: 'Intelligence artificielle', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg> },
  { id: 'agenda', label: 'Agenda', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { id: 'appearance', label: 'Apparence', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none"/></svg> },
  { id: 'billing', label: 'Facturation', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg> },
  { id: 'notifications', label: 'Notifications', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
  { id: 'security', label: 'Sécurité', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> },
  { id: 'danger', label: 'Zone de danger', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>, danger: true },
]

// --- Facturation ------------------------------------------------------
// Aucune intégration Stripe n'existe encore dans le projet (pas de route
// app/api/stripe/*, pas de colonnes stripe_customer_id / current_period_end
// / billing_cycle sur profiles). Tant que ça n'est pas branché, on n'affiche
// que ce qu'on sait réellement (profiles.plan) — pas de carte, de date de
// renouvellement ou de facture inventées.
// TODO: une fois les routes create-checkout-session / webhook /
// create-portal-session en place, remplacer les états "non disponible"
// ci-dessous par les vraies données (méthode de paiement, factures Stripe,
// current_period_end).
type Invoice = { id: string; date: Date; amount: string; status: 'paid' | 'open' | 'failed'; url: string }
const INVOICES: Invoice[] = []

const INVOICE_STATUS_LABEL: Record<string, string> = { paid: 'Payée', open: 'En attente', failed: 'Échouée' }

function formatFrenchDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function SettingsContent() {
  const { theme, changeTheme } = useTheme()
  // Cache partagé (voir hooks/useProfile.ts) — cette page refaisait jusqu'ici
  // sa propre requête profiles à chaque visite, sans aucun cache, en plus de
  // celles de Sidebar/NotificationManager/layout pour la même ligne.
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const mailboxNotice = searchParams.get('mailbox')
  const mailboxErrorDetail = searchParams.get('mailbox_error')
  const calendarNotice = searchParams.get('calendar')
  const calendarErrorDetail = searchParams.get('calendar_error')
  const initialTab = searchParams.get('tab') || (mailboxNotice ? 'mailboxes' : 'account')

  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [tone, setTone] = useState<'professional' | 'formal' | 'casual'>('professional')
  const [notifs, setNotifs] = useState(true)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [digestHour, setDigestHour] = useState(8)
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [autoArchive, setAutoArchive] = useState(false)
  const [autoSchedule, setAutoSchedule] = useState(false)
  const [autoTasks, setAutoTasks] = useState(true)
  // Langue des réponses IA uniquement (pas l'interface, qui n'a pas de
  // système de traduction — la précédente case "Langue" dans Apparence
  // prétendait changer les deux mais ne faisait réellement rien du tout).
  const [replyLanguage, setReplyLanguage] = useState<ReplyLanguage>('fr')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState('free')

  // Agenda
  const [calendarAccount, setCalendarAccount] = useState<'gmail' | 'outlook' | null>(null)
  const [calendarEmail, setCalendarEmail] = useState('')
  const [connectingCalendar, setConnectingCalendar] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState(30)
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [bufferTime, setBufferTime] = useState(15)
  const [autoDeclineOutsideHours, setAutoDeclineOutsideHours] = useState(false)
  const [calendarAutoSync, setCalendarAutoSync] = useState(true)

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  // 'google' ou 'email' — pilote l'onglet Sécurité (voir plus bas) : afficher
  // "Authentification Google" pour un compte créé par mot de passe induisait
  // en erreur sur la méthode de connexion réellement utilisée.
  const [authProvider, setAuthProvider] = useState<string>('email')
  const [initials, setInitials] = useState('?')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [mailboxes, setMailboxes] = useState<{ email: string; provider: string; is_connected: boolean }[]>([])

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPlanComparison, setShowPlanComparison] = useState(false)

  useEffect(() => {
    async function load() {
      // getSession() (pas getUser()) : lit la session déjà en mémoire/
      // localStorage, aucun aller-retour réseau vers le serveur d'auth —
      // getUser() revalide le JWT à chaque appel, un round-trip entier rien
      // que pour récupérer l'id dont on a besoin pour les requêtes suivantes.
      // Sans impact sécurité : la RLS côté base s'appuie de toute façon sur
      // le token de la session, pas sur ce qu'on lit ici côté client.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const name = user.user_metadata?.full_name || user.email || ''
      setUserName(name)
      setNameInput(name)
      setUserEmail(user.email || '')
      setAvatarUrl(user.user_metadata?.avatar_url || null)
      setAuthProvider(user.app_metadata?.provider || 'email')

      const parts = name.split(' ')
      if (parts.length >= 2) {
        setInitials((parts[0][0] + parts[1][0]).toUpperCase())
      } else {
        setInitials(name[0]?.toUpperCase() || '?')
      }

      // Le profil lui-même vient désormais du cache partagé useProfile() (voir
      // l'effet séparé plus bas) — il ne reste ici que les deux requêtes
      // propres à cette page, toujours en Promise.all pour s'exécuter en
      // parallèle plutôt que l'une après l'autre.
      const [{ data: boxes }, { data: calAccount }] = await Promise.all([
        supabase
          .from('mailboxes')
          .select('email, provider, is_connected')
          .eq('user_id', user.id),
        supabase
          .from('calendar_accounts')
          .select('email, is_connected')
          .eq('user_id', user.id)
          .eq('is_connected', true)
          .maybeSingle(),
      ])

      if (boxes) setMailboxes(boxes)
      if (calAccount?.email) setCalendarEmail(calAccount.email)

      setLoading(false)
    }
    load()
  }, [])

  // Réagit au profil renvoyé par le cache partagé (voir hooks/useProfile.ts) —
  // il arrive de façon asynchrone, indépendamment de l'effet ci-dessus, donc
  // dans un effet séparé plutôt que dans le Promise.all de `load()`.
  useEffect(() => {
    if (!profile) return
    setTone(profile.reply_tone || 'professional')
    setReplyLanguage((REPLY_LANGUAGES as string[]).includes(profile.reply_language) ? profile.reply_language : 'fr')
    setNotifs(profile.notifs_enabled ?? true)
    setAutoSchedule(profile.auto_schedule ?? false)
    setAutoTasks(profile.auto_tasks ?? true)
    setAutoArchive(profile.auto_archive ?? false)
    setCurrentPlan(profile.plan || 'free')
    setTimezone(profile.timezone || 'Europe/Paris')
    setDefaultDuration(profile.default_event_duration || 30)
    setWorkStart(profile.work_start || '09:00')
    setWorkEnd(profile.work_end || '18:00')
    setBufferTime(profile.buffer_minutes ?? 15)
    setAutoDeclineOutsideHours(profile.auto_decline_outside_hours ?? false)
    setCalendarAccount(profile.calendar_provider || null)
    setCalendarAutoSync(profile.calendar_auto_sync ?? true)
    setEmailNotifs(profile.email_digest_enabled ?? true)
    setUrgentOnly(profile.urgent_only_notifs ?? false)
    setDigestHour(profile.digest_send_hour ?? 8)
  }, [profile])

  async function handleSave() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      reply_tone: tone,
      reply_language: replyLanguage,
      theme,
      notifs_enabled: notifs,
      auto_schedule: autoSchedule,
      auto_tasks: autoTasks,
      auto_archive: autoArchive,
      timezone,
      default_event_duration: defaultDuration,
      work_start: workStart,
      work_end: workEnd,
      buffer_minutes: bufferTime,
      auto_decline_outside_hours: autoDeclineOutsideHours,
      calendar_auto_sync: calendarAutoSync,
      email_digest_enabled: emailNotifs,
      urgent_only_notifs: urgentOnly,
      digest_send_hour: digestHour,
    }).eq('id', user.id)

    if (error) {
      console.error('❌ Erreur sauvegarde profil:', error.message)
      alert('La sauvegarde a échoué : ' + error.message)
      return
    }

    if (notifs && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    // Reflète immédiatement le changement dans le cache partagé — sans ça,
    // Sidebar/NotificationManager/le layout garderaient l'ancienne valeur
    // jusqu'à la prochaine fenêtre de dédoublonnage (30s).
    refreshProfile()

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleConnectGmail() {
    const mailboxLimit = getPlan(currentPlan).limits.mailboxes
    if (mailboxLimit !== null && mailboxes.length >= mailboxLimit) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/mailboxes/connect', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function handleConnectCalendar() {
    setConnectingCalendar(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setConnectingCalendar(false); return }

    const res = await fetch('/api/calendar/connect', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setConnectingCalendar(false)
  }

  // Une policy RLS ("Users manage own calendar accounts") permet à
  // l'utilisateur d'agir directement sur sa propre ligne — pas besoin d'une
  // route serveur dédiée juste pour supprimer/désactiver sa propre connexion.
  async function handleDisconnectCalendar() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    await supabase.from('calendar_accounts').delete().eq('user_id', user.id)
    await supabase.from('profiles').update({ calendar_provider: null }).eq('id', user.id)

    setCalendarAccount(null)
    setCalendarEmail('')
    refreshProfile()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      await supabase.auth.updateUser({ data: { avatar_url: newUrl } })
      setAvatarUrl(newUrl)
    } else {
      // Sans ce retour, un échec d'upload (type de fichier refusé par le
      // bucket, quota, réseau...) laissait juste le bouton revenir à son état
      // normal sans aucune explication — même convention que handleSave
      // ci-dessus pour une erreur de sauvegarde.
      alert('Le téléversement de la photo a échoué : ' + uploadError.message)
    }
    setUploading(false)
  }

  // TODO: rediriger vers le portail client Stripe (/api/stripe/create-portal-session)
  // une fois la route en place. En attendant, on redirige vers le support plutôt
  // que de simuler un bouton qui ne ferait rien (même choix que PlanCards).
  function handleManagePayment() {
    window.location.href = `mailto:support@sveltly.fr?subject=${encodeURIComponent('Mettre à jour mon moyen de paiement')}`
  }

  // TODO: brancher sur le portail client Stripe ou une route dédiée d'annulation
  function handleCancelSubscription() {
    const confirmed = window.confirm(
      "Annuler votre abonnement Pro ? Vous conserverez l'accès Pro jusqu'à la fin de la période déjà payée, puis votre compte repassera automatiquement au forfait Gratuit."
    )
    if (!confirmed) return
    window.location.href = `mailto:support@sveltly.fr?subject=${encodeURIComponent('Annuler mon abonnement Pro')}`
  }

  const [exportingData, setExportingData] = useState(false)
  const [managingSessions, setManagingSessions] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Déconnecte toutes les AUTRES sessions (scope 'others', pas 'global') —
  // révoque leurs refresh tokens côté Supabase sans se déconnecter
  // soi-même depuis cet onglet. C'est l'action réelle la plus proche de
  // "gérer mes sessions actives" que l'API Supabase permette côté client
  // (lister chaque session par appareil demande la clé service role, donc
  // une route serveur dédiée — hors scope ici).
  async function handleManageSessions() {
    const confirmed = window.confirm(
      "Déconnecter tous les autres appareils actuellement connectés à votre compte ? Cette session-ci restera active."
    )
    if (!confirmed) return
    setManagingSessions(true)
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    setManagingSessions(false)
    if (error) alert('Erreur lors de la déconnexion des autres sessions : ' + error.message)
    else alert('Tous les autres appareils ont été déconnectés.')
  }

  // Export RGPD (droit à la portabilité) — uniquement les données que
  // l'utilisateur peut déjà lire sur lui-même via RLS ; les jetons OAuth
  // chiffrés (mailboxes.access_token/refresh_token) sont délibérément exclus
  // de la sélection, aucune raison de les faire transiter dans cet export.
  async function handleExportData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    setExportingData(true)
    try {
      const [profileRes, mailboxesRes, tasksRes, eventsRes, contactsRes, repliesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mailboxes').select('email, provider, is_connected, created_at').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('calendar_events').select('title, date, start_time, end_time, description, created_at').eq('user_id', user.id),
        supabase.from('contacts').select('email, reply_tone, created_at').eq('user_id', user.id),
        supabase.from('reply_history').select('body, sent_at, was_ai').eq('user_id', user.id),
      ])

      const payload = {
        exportedAt: new Date().toISOString(),
        account: { id: user.id, email: user.email, createdAt: user.created_at },
        profile: profileRes.data,
        mailboxes: mailboxesRes.data || [],
        tasks: tasksRes.data || [],
        calendarEvents: eventsRes.data || [],
        contacts: contactsRes.data || [],
        replyHistory: repliesRes.data || [],
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sveltly-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Erreur lors de l\'export : ' + (err?.message || 'réessayez'))
    }
    setExportingData(false)
  }

  // Route serveur dédiée (voir app/api/account/delete) : supprimer un
  // auth.users nécessite la clé service-role, jamais exposable au navigateur.
  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Supprimer définitivement votre compte Sveltly ? Cette action est irréversible et immédiate : tous vos emails analysés, événements, tâches et préférences seront effacés.'
    )
    if (!confirmed) return

    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert('La suppression a échoué : ' + (body.error || 'réessayez.'))
        setDeletingAccount(false)
        return
      }

      // Le compte n'existe plus côté serveur : on nettoie la session locale
      // puis on redirige — rester sur cette page afficherait une interface
      // "connectée" pour un compte qui n'existe plus.
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert('La suppression a échoué : ' + (err?.message || 'réessayez.'))
      setDeletingAccount(false)
    }
  }

  async function handleSaveName() {
    await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } })
    setUserName(nameInput.trim())
    const parts = nameInput.trim().split(' ')
    setInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.[0]?.toUpperCase() || '?'))
    setEditingName(false)
  }

  if (loading || profileLoading) {
    return (
      <AppLayout title="Paramètres" subtitle="">
        <div className={styles.loadingGrid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${styles.skeletonBlock} skeleton`} />
          ))}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Paramètres" subtitle="Gérez votre compte et vos préférences">
      <div className={styles.layout}>

        <nav className={styles.settingsNav}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''} ${tab.danger ? styles.navItemDanger : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.panel}>

          {activeTab === 'account' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Compte</h2>
                <p className={styles.sectionDesc}>Vos informations de profil, visibles dans l'application.</p>
              </div>
              <div className={styles.card}>
                <div className={styles.profileRow}>
                  <div className={styles.avatarUploadWrap}>
                    <Avatar src={avatarUrl} initials={initials} size={48} />
                    <button
                      className={styles.avatarEditBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Changer la photo"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg"
                      className={styles.hiddenInput}
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className={styles.profileInfo}>
                    {editingName ? (
                      <div className={styles.inlineEdit}>
                        <input
                          className={styles.nameInput}
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                          autoFocus
                        />
                        <button className={styles.linkBtn} onClick={handleSaveName}>Enregistrer</button>
                      </div>
                    ) : (
                      <p className={styles.name} onClick={() => setEditingName(true)} style={{ cursor: 'pointer' }}>
                        {userName || 'Ajouter un prénom'}
                      </p>
                    )}
                    <p className={styles.email}>{userEmail}</p>
                  </div>
                  <span className={styles.planBadge}>{currentPlan === 'pro' ? 'Pro' : 'Gratuit'}</span>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'mailboxes' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Boîtes mail</h2>
                <p className={styles.sectionDesc}>Les comptes email connectés que <Brand /> analyse et trie pour vous.</p>
              </div>
              {mailboxNotice === 'connected' && (
                <p className={styles.mailboxLimitNote}>Boîte mail connectée avec succès.</p>
              )}
              {mailboxNotice === 'error' && (
                <p className={styles.mailboxLimitNote}>
                  Connexion impossible{mailboxErrorDetail ? ` (${mailboxErrorDetail})` : ''}. Réessayez.
                </p>
              )}
              <div className={styles.card}>
                {mailboxes.length === 0 ? (
                  <div className={styles.emptyMailbox}>
                    <p>Aucune boîte mail connectée</p>
                  </div>
                ) : (
                  mailboxes.map((box, i) => (
                    <div key={i}>
                      <div className={styles.mailboxRow}>
                        <div className={styles.providerIcon}>
                          {box.provider === 'gmail' ? 'G' : 'O'}
                        </div>
                        <div>
                          <p className={styles.mailboxName}>
                            {box.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                          </p>
                          <p className={styles.mailboxEmail}>{box.email}</p>
                        </div>
                        <span className={`${styles.connectedBadge} ${!box.is_connected ? styles.disconnected : ''}`}>
                          {box.is_connected ? 'Connecté' : 'Déconnecté'}
                        </span>
                      </div>
                      {i < mailboxes.length - 1 && <div className={styles.divider} />}
                    </div>
                  ))
                )}
                <div className={styles.divider} />
                {(() => {
                  const mailboxLimit = getPlan(currentPlan).limits.mailboxes
                  const atLimit = mailboxLimit !== null && mailboxes.length >= mailboxLimit
                  return atLimit ? (
                    <UsageLimitCard
                      title="Limite de boîtes mail atteinte"
                      message={`${userName.split(' ')[0] ? userName.split(' ')[0] + ', vous avez' : 'Vous avez'} connecté ${mailboxes.length} boîte mail sur ${mailboxLimit} pour le forfait Gratuit. Passez à Pro pour en connecter d'autres.`}
                      current={mailboxes.length}
                      max={mailboxLimit}
                      tone="neutral"
                    />
                  ) : (
                    <button className={styles.addMailboxBtn} onClick={handleConnectGmail}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Ajouter une boîte mail
                    </button>
                  )
                })()}
              </div>
            </section>
          )}

          {activeTab === 'ai' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Intelligence artificielle</h2>
                <p className={styles.sectionDesc}>Comment <Brand /> analyse et répond à vos emails à votre place.</p>
              </div>
              <div className={styles.card}>
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Ton des réponses</p>
                    <p className={styles.prefDesc}>Change le style d'écriture de tous les brouillons générés automatiquement. Peut être ajusté au cas par cas sur chaque email, ou mémorisé pour un expéditeur précis.</p>
                  </div>
                </div>
                <div className={styles.toneOptions}>
                  {TONES.map(t => (
                    <button
                      key={t}
                      className={`${styles.toneOption} ${tone === t ? styles.toneOptionActive : ''}`}
                      onClick={() => setTone(t)}
                      type="button"
                    >
                      <span className={styles.toneOptionName}>{TONE_LABEL[t]}</span>
                      <p className={styles.toneOptionExample}>{TONE_EXAMPLE[t]}</p>
                    </button>
                  ))}
                </div>
                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Langue des réponses</p>
                    <p className={styles.prefDesc}>{REPLY_LANGUAGE_DESC[replyLanguage]} Les résumés et points clés restent toujours en français, quel que soit ce réglage.</p>
                  </div>
                  <div className={styles.segmented}>
                    {REPLY_LANGUAGES.map(l => (
                      <button
                        key={l}
                        type="button"
                        className={`${styles.segBtn} ${replyLanguage === l ? styles.segActive : ''}`}
                        onClick={() => setReplyLanguage(l)}
                      >
                        {REPLY_LANGUAGE_LABEL[l]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Planification automatique</p>
                    <p className={styles.prefDesc}>Ajoute directement à votre agenda les rendez-vous détectés dans vos emails, sans que vous ayez à cliquer sur "Ajouter à l'agenda"</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${autoSchedule ? styles.toggleOn : ''}`}
                    onClick={() => setAutoSchedule(!autoSchedule)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Créer des tâches automatiquement depuis mes emails</p>
                    <p className={styles.prefDesc}>Ajoute une tâche quand un email contient une demande d'action sans créneau précis (ex: "peux-tu valider ce document ?"), séparément des rendez-vous détectés</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${autoTasks ? styles.toggleOn : ''}`}
                    onClick={() => setAutoTasks(!autoTasks)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Archivage automatique</p>
                    <p className={styles.prefDesc}>Déplace les newsletters et emails normaux hors de votre boîte après 7 jours</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${autoArchive ? styles.toggleOn : ''}`}
                    onClick={() => setAutoArchive(!autoArchive)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'agenda' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Agenda</h2>
                <p className={styles.sectionDesc}>Comment <Brand /> détecte et ajoute vos rendez-vous.</p>
              </div>

              <div className={styles.card}>
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Fuseau horaire</p>
                    <p className={styles.prefDesc}>Utilisé pour interpréter les horaires mentionnés dans vos emails, et pour l'heure d'envoi du résumé quotidien</p>
                  </div>
                  <select
                    className={styles.selectInput}
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                  >
                    <option value="Europe/Paris">Paris (UTC+1)</option>
                    <option value="Europe/London">Londres (UTC+0)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                  </select>
                </div>

                <div className={styles.divider} />

                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Durée par défaut d'un événement</p>
                    <p className={styles.prefDesc}>Appliquée quand aucune durée n'est précisée dans l'email</p>
                  </div>
                  <div className={styles.segmented}>
                    {[15, 30, 45, 60].map(d => (
                      <button
                        key={d}
                        className={`${styles.segBtn} ${defaultDuration === d ? styles.segActive : ''}`}
                        onClick={() => setDefaultDuration(d)}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Heures de disponibilité</p>
                    <p className={styles.prefDesc}>Plage horaire dans laquelle <Brand /> peut proposer ou ajouter des rendez-vous</p>
                  </div>
                  <div className={styles.timeRangeRow}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={workStart}
                      onChange={e => setWorkStart(e.target.value)}
                    />
                    <span className={styles.timeSep}>—</span>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={workEnd}
                      onChange={e => setWorkEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Battement entre deux rendez-vous</p>
                    <p className={styles.prefDesc}>Marge automatiquement laissée libre avant et après chaque événement détecté</p>
                  </div>
                  <div className={styles.segmented}>
                    {[0, 5, 15, 30].map(b => (
                      <button
                        key={b}
                        className={`${styles.segBtn} ${bufferTime === b ? styles.segActive : ''}`}
                        onClick={() => setBufferTime(b)}
                      >
                        {b === 0 ? 'Aucun' : `${b} min`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Refuser automatiquement hors disponibilités</p>
                    <p className={styles.prefDesc}>Les rendez-vous proposés en dehors de vos heures de disponibilité sont signalés en conflit plutôt qu'ajoutés</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${autoDeclineOutsideHours ? styles.toggleOn : ''}`}
                    onClick={() => setAutoDeclineOutsideHours(!autoDeclineOutsideHours)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>

              <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                <h3 className={styles.prefLabel}>Calendrier connecté</h3>
              </div>
              {calendarNotice === 'connected' && (
                <p className={styles.mailboxLimitNote}>Google Calendar connecté avec succès.</p>
              )}
              {calendarNotice === 'error' && (
                <p className={styles.mailboxLimitNote}>
                  Connexion impossible{calendarErrorDetail ? ` (${calendarErrorDetail})` : ''}. Réessayez.
                </p>
              )}
              <div className={styles.card}>
                {calendarAccount ? (
                  <>
                    <div className={styles.mailboxRow}>
                      <div className={styles.providerIcon}>{calendarAccount === 'gmail' ? 'G' : 'O'}</div>
                      <div>
                        <p className={styles.mailboxName}>{calendarAccount === 'gmail' ? 'Google Calendar' : 'Outlook Calendar'}</p>
                        <p className={styles.mailboxEmail}>{calendarEmail || 'Les événements détectés y sont ajoutés automatiquement'}</p>
                      </div>
                      <span className={styles.connectedBadge}>Connecté</span>
                      <button className={styles.linkBtn} onClick={handleDisconnectCalendar}>Déconnecter</button>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.prefRow}>
                      <div>
                        <p className={styles.prefLabel}>Synchronisation automatique</p>
                        <p className={styles.prefDesc}>
                          {calendarAutoSync
                            ? "Les changements sur Google Calendar sont importés automatiquement à chaque ouverture de l'agenda."
                            : "Désactivée — utilisez le bouton \"Synchroniser\" dans l'agenda pour importer les changements manuellement."}
                        </p>
                      </div>
                      <button
                        className={`${styles.toggle} ${calendarAutoSync ? styles.toggleOn : ''}`}
                        onClick={() => setCalendarAutoSync(!calendarAutoSync)}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>
                  </>
                ) : currentPlan !== 'pro' ? (
                  <div className={styles.proLockCard}>
                    <span className={styles.proLockBadge}>Pro</span>
                    <p className={styles.proLockText}>
                      La synchronisation Google Calendar (import et export automatiques des deux côtés) fait partie du forfait Pro.
                    </p>
                    <a href="/settings?tab=billing" className={styles.proLockCta}>Passer à Pro</a>
                  </div>
                ) : (
                  <>
                    <div className={styles.emptyMailbox}>
                      <p>Aucun calendrier connecté — les événements détectés ne peuvent pas être ajoutés automatiquement.</p>
                    </div>
                    <div className={styles.divider} />
                    <button className={styles.addMailboxBtn} onClick={handleConnectCalendar} disabled={connectingCalendar}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      {connectingCalendar ? 'Connexion...' : 'Connecter Google Calendar'}
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === 'appearance' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Apparence</h2>
                <p className={styles.sectionDesc}>Personnalisez l'affichage de l'interface.</p>
              </div>
              <div className={styles.card}>
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Thème</p>
                    <p className={styles.prefDesc}>Bascule instantanément l'interface entre clair, sombre, ou suit votre système</p>
                  </div>
                  <div className={styles.segmented}>
                    {(['light', 'dark', 'system'] as const).map(t => (
                      <button
                        key={t}
                        className={`${styles.segBtn} ${theme === t ? styles.segActive : ''}`}
                        onClick={() => changeTheme(t)}
                      >
                        {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Système'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'billing' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Facturation</h2>
                <p className={styles.sectionDesc}>Votre forfait, votre moyen de paiement et l'historique de vos factures.</p>
              </div>

              <div className={styles.card}>
                <div className={styles.planCurrentRow}>
                  <div className={`${styles.planCurrentIcon} ${currentPlan === 'pro' ? styles.planCurrentIconPro : ''}`}>
                    {currentPlan === 'pro' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5 7 12l5-8 5 8 4.5-2.5L20 19H4z"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6z"/><polyline points="9 12 11 14 15 10"/></svg>
                    )}
                  </div>
                  <div className={styles.planCurrentInfo}>
                    <p className={styles.planCurrentName}>Forfait {getPlan(currentPlan).name}</p>
                    <p className={styles.planCurrentSub}>
                      {currentPlan === 'pro' ? 'Abonnement actif' : 'Aucune facturation sur le plan Gratuit'}
                    </p>
                  </div>
                  <button className={styles.linkBtn} onClick={() => setShowPlanComparison(v => !v)}>
                    {showPlanComparison ? 'Fermer' : 'Modifier le forfait'}
                  </button>
                </div>
              </div>

              {showPlanComparison && (
                <div className={styles.planComparisonWrap}>
                  <PlanCards />
                </div>
              )}

              {currentPlan === 'pro' && (
                <>
                  <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                    <h3 className={styles.prefLabel}>Moyen de paiement</h3>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.paymentRow}>
                      <div className={styles.planCurrentInfo}>
                        <p className={styles.planCurrentSub}>Gestion du moyen de paiement bientôt disponible.</p>
                      </div>
                      <button className={styles.linkBtn} onClick={handleManagePayment}>Contacter le support</button>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                <h3 className={styles.prefLabel}>Factures</h3>
              </div>
              <div className={styles.card}>
                {INVOICES.length === 0 ? (
                  <div className={styles.emptyMailbox}><p>Aucune facture pour l'instant.</p></div>
                ) : (
                  <div className={styles.invoiceTableWrap}>
                    <table className={styles.invoiceTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INVOICES.map(invoice => (
                          <tr key={invoice.id}>
                            <td data-label="Date">{formatFrenchDate(invoice.date)}</td>
                            <td data-label="Total">{invoice.amount}</td>
                            <td data-label="Statut">
                              <span className={`${styles.invoiceStatus} ${invoice.status !== 'paid' ? styles.invoiceStatusIssue : ''}`}>
                                {INVOICE_STATUS_LABEL[invoice.status]}
                              </span>
                            </td>
                            <td data-label="Actions">
                              <a href={invoice.url} target="_blank" rel="noreferrer" className={styles.linkBtn}>Voir</a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {currentPlan === 'pro' && (
                <>
                  <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                    <h3 className={`${styles.prefLabel} ${styles.dangerTitle}`}>Annuler l'abonnement</h3>
                  </div>
                  <div className={`${styles.card} ${styles.dangerCard}`}>
                    <div className={styles.securityRow}>
                      <div>
                        <p className={styles.prefLabel}>Annuler mon abonnement Pro</p>
                        <p className={styles.prefDesc}>
                          Vous conserverez l'accès Pro jusqu'à la fin de la période déjà payée,
                          puis votre compte repassera automatiquement au forfait Gratuit.
                        </p>
                      </div>
                      <button className={styles.dangerBtn} onClick={handleCancelSubscription}>Annuler</button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Notifications</h2>
                <p className={styles.sectionDesc}>Choisissez quand et comment <Brand /> vous alerte.</p>
              </div>
              <div className={styles.card}>
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Notifications push</p>
                    <p className={styles.prefDesc}>Affiche une alerte dans le navigateur dès qu'un email est trié</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${notifs ? styles.toggleOn : ''}`}
                    onClick={() => setNotifs(!notifs)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Résumé par email</p>
                    <p className={styles.prefDesc}>Envoie un récapitulatif de vos emails non traités chaque jour, à l'heure de votre choix</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${emailNotifs ? styles.toggleOn : ''}`}
                    onClick={() => setEmailNotifs(!emailNotifs)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>

                {emailNotifs && (
                  <>
                    <div className={styles.divider} />
                    <div className={styles.prefRow}>
                      <div>
                        <p className={styles.prefLabel}>Heure d'envoi</p>
                        <p className={styles.prefDesc}>Selon votre fuseau horaire, réglé dans l'onglet Agenda</p>
                      </div>
                      <select
                        className={styles.selectInput}
                        value={digestHour}
                        onChange={e => setDigestHour(parseInt(e.target.value, 10))}
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className={styles.divider} />
                <div className={styles.prefRow}>
                  <div>
                    <p className={styles.prefLabel}>Urgents uniquement</p>
                    <p className={styles.prefDesc}>Coupe toutes les alertes sauf celles pour les emails classés urgents</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${urgentOnly ? styles.toggleOn : ''}`}
                    onClick={() => setUrgentOnly(!urgentOnly)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Sécurité</h2>
                <p className={styles.sectionDesc}>Contrôlez l'accès à votre compte, et voyez concrètement comment vos données sont protégées.</p>
              </div>

              <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                <h3 className={styles.prefLabel}>Compte</h3>
              </div>
              <div className={styles.card}>
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Authentification</p>
                    <p className={styles.prefDesc}>
                      {authProvider === 'google'
                        ? <>Connexion à <Brand /> via Google OAuth 2.0 — aucun mot de passe <Brand /> associé à ce compte.</>
                        : 'Connexion par mot de passe (8 caractères minimum). Vous pouvez le réinitialiser à tout moment depuis l\'écran de connexion.'}
                    </p>
                  </div>
                  <span className={styles.securityBadge}>Actif</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Sessions actives</p>
                    <p className={styles.prefDesc}>Déconnecte tous les autres appareils actuellement connectés à votre compte — celui-ci reste actif.</p>
                  </div>
                  <button className={styles.linkBtn} onClick={handleManageSessions} disabled={managingSessions}>
                    {managingSessions ? 'Déconnexion...' : 'Gérer'}
                  </button>
                </div>
              </div>

              <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                <h3 className={styles.prefLabel}>Protection de vos données</h3>
              </div>
              <div className={styles.card}>
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Connexions chiffrées</p>
                    <p className={styles.prefDesc}>Toutes les communications avec <Brand /> passent par HTTPS/TLS, avec HSTS activé — aucun échange en clair, jamais.</p>
                  </div>
                  <span className={styles.securityBadge}>TLS</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Jetons de connexion chiffrés</p>
                    <p className={styles.prefDesc}>Vos accès Gmail et Google Agenda sont chiffrés (AES-256-GCM) avant d'être stockés — jamais en clair, jamais lisibles depuis votre navigateur.</p>
                  </div>
                  <span className={styles.securityBadge}>AES-256</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Isolation de vos données</p>
                    <p className={styles.prefDesc}>Chaque compte est cloisonné au niveau de la base de données (Row Level Security) — techniquement impossible d'accéder aux données d'un autre utilisateur, même en cas de bug applicatif.</p>
                  </div>
                  <span className={styles.securityBadge}>Isolé</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Contenu des emails affichés</p>
                    <p className={styles.prefDesc}>Le code de vos emails est systématiquement nettoyé avant affichage, pour empêcher tout script malveillant qu'un email reçu pourrait contenir de s'exécuter.</p>
                  </div>
                  <span className={styles.securityBadge}>Filtré</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Intelligence artificielle</p>
                    <p className={styles.prefDesc}>Le contenu transmis à notre fournisseur d'analyse IA ne sert qu'à traiter cet email précis — jamais utilisé pour entraîner un modèle, jamais conservé au-delà du traitement.</p>
                  </div>
                  <span className={styles.securityBadge}>Non réutilisé</span>
                </div>
              </div>

              <div className={styles.sectionHead} style={{ marginTop: 8 }}>
                <h3 className={styles.prefLabel}>Vos données</h3>
              </div>
              <div className={styles.card}>
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Données personnelles</p>
                    <p className={styles.prefDesc}>Télécharge une archive de toutes vos données <Brand /> — jamais vos jetons de connexion, exclus volontairement de cet export.</p>
                  </div>
                  <button className={styles.linkBtn} onClick={handleExportData} disabled={exportingData}>
                    {exportingData ? 'Export...' : 'Exporter'}
                  </button>
                </div>
                <div className={styles.divider} />
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Politique de confidentialité</p>
                    <p className={styles.prefDesc}>Le détail complet de ce qui est collecté, pourquoi, et vos droits (RGPD).</p>
                  </div>
                  <a className={styles.linkBtn} href="/legal/privacy" target="_blank" rel="noopener noreferrer">Consulter</a>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'danger' && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Zone de danger</h2>
                <p className={styles.sectionDesc}>Ces actions sont irréversibles. Assurez-vous d'avoir exporté vos données avant de continuer.</p>
              </div>
              <div className={`${styles.card} ${styles.dangerCard}`}>
                <div className={styles.securityRow}>
                  <div>
                    <p className={styles.prefLabel}>Supprimer le compte</p>
                    <p className={styles.prefDesc}>Toutes vos données — emails analysés, événements, préférences — seront définitivement effacées</p>
                  </div>
                  <button className={styles.dangerBtn} onClick={handleDeleteAccount} disabled={deletingAccount}>
                    {deletingAccount ? 'Suppression...' : 'Supprimer mon compte'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab !== 'danger' && activeTab !== 'security' && activeTab !== 'billing' && (
            <div className={styles.saveRow}>
              <button
                className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`}
                onClick={handleSave}
              >
                {saved ? 'Modifications enregistrées' : 'Enregistrer les modifications'}
              </button>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}
