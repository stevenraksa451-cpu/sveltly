'use client'
// app/(app)/dashboard/page.tsx
import { useState, useEffect, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import TodayEssentials from '@/components/dashboard/TodayEssentials'
import AgendaTimeline from '@/components/dashboard/AgendaTimeline'
import AIBanner from '@/components/dashboard/AIBanner'
import TasksCard from '@/components/dashboard/TasksCard'
import { supabase } from '@/lib/supabase'
import { useEmails } from '@/hooks/useEmails'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { calculateTimeSavedForTodayEmails, formatTimeSaved, getEmailsReceivedToday, TIME_SAVED_METHOD_NOTE } from '@/lib/time-saved'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const { emails, loading: emailsLoading } = useEmails()
  const { events, loading: eventsLoading } = useCalendarEvents()
  const [userName, setUserName] = useState('')
  const [userLoading, setUserLoading] = useState(true)
  const [timeInfoOpen, setTimeInfoOpen] = useState(false)

  // Chargements découplés : le nom vient d'une session déjà en mémoire (quasi
  // instantané), alors que les emails (Gmail + analyse Groq) et l'agenda
  // prennent chacun plusieurs secondes, indépendamment l'un de l'autre. Les
  // regrouper dans un seul flag "loading" global retardait l'affichage du nom
  // jusqu'à ce que la section la plus lente ait fini — chaque section garde
  // maintenant son propre indicateur, masqué dès que sa propre donnée (même en
  // cache SWR) est disponible plutôt que d'attendre la fin du premier fetch.
  const emailsPending = emailsLoading && emails.length === 0
  const eventsPending = eventsLoading && events.length === 0

  useEffect(() => {
    async function loadUser() {
      // getSession() (pas getUser()) : lu depuis la session déjà en mémoire/
      // localStorage, aucun aller-retour réseau — le nom/avatar s'affichent
      // dès ce retour, sans attendre emails ni agenda (voir userLoading).
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user) {
        const name = user.user_metadata?.full_name || user.email || ''
        setUserName(name.split(' ')[0])
      }
      setUserLoading(false)
    }
    loadUser()
  }, [])

  const todayIso = new Date().toISOString().split('T')[0]

  // Mémoïsés sur [emails]/[events] : sans ça, ces parcours (jusqu'à
  // plusieurs centaines d'emails/événements) se refaisaient à CHAQUE rendu du
  // composant — y compris ceux qui n'ont rien à voir avec de nouvelles
  // données, comme ouvrir/fermer l'info-bulle "Temps économisé" (setTimeInfoOpen
  // ci-dessus, qui réécrit tout le composant). Recalcule uniquement quand la
  // référence emails/events change réellement (nouveau résultat SWR).
  const todayEvents = useMemo(() => events.filter((e: any) => e.date === todayIso), [events, todayIso])
  const unreadCount = useMemo(() => emails.filter((e: any) => !e.isRead).length, [emails])
  const importantCount = useMemo(
    () => emails.filter((e: any) => e.priority === 'urgent' || e.priority === 'important').length,
    [emails]
  )
  // Un seul passage sur `emails` pour dériver à la fois le compte et le temps
  // économisé (calculateTimeSavedForTodayEmails prend directement ce
  // sous-ensemble) — l'ancien code filtrait deux fois la même liste
  // (getEmailsReceivedToday ici, puis à nouveau à l'intérieur de
  // calculateTimeSavedSeconds).
  const todayEmails = useMemo(() => getEmailsReceivedToday(emails), [emails])
  const todayEmailsCount = todayEmails.length
  const timeSavedSeconds = useMemo(() => calculateTimeSavedForTodayEmails(todayEmails), [todayEmails])

  return (
    <AppLayout title="Tableau de bord" subtitle="" hideTitle>
      <div className={styles.pageGlow} aria-hidden="true" />

      <div className={styles.page}>
        <div className={styles.greeting}>
          <div>
            <h1 className={styles.greetingTitle}>Bonjour, {userLoading ? '...' : userName} </h1>
            <p className={styles.greetingSub}>Voici un aperçu de votre journée.</p>
          </div>
        </div>

        <div className={styles.topRow}>
          <div className={styles.statBand}>
            <div className={styles.statCell}>
              <span className={`${styles.statChip} ${styles.chipCoral}`} />
              <p className={styles.statHeroValue}>{emailsPending ? '—' : importantCount}</p>
              <p className={styles.statLabel}>Emails importants</p>
              <p className={styles.statSub}>{emailsPending ? '' : `${unreadCount} non lus`}</p>
            </div>

            <div className={styles.statCell}>
              <span className={`${styles.statChip} ${styles.chipGold}`} />
              <p className={styles.statValue}>{eventsPending ? '—' : todayEvents.length}</p>
              <p className={styles.statLabel}>Réunions aujourd'hui</p>
              <p className={styles.statSub}>
                {eventsPending ? '' : todayEvents.length > 0 ? `Prochaine à ${todayEvents[0].startTime}` : 'Rien de prévu'}
              </p>
            </div>

            <div className={styles.statCell}>
              <span className={`${styles.statChip} ${styles.chipDusk}`} />
              <p className={styles.statValue}>{emailsPending ? '—' : formatTimeSaved(timeSavedSeconds)}</p>
              <div className={styles.statLabelRow}>
                <span className={styles.statIcon} aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className={styles.statLabel}>Temps économisé aujourd'hui</p>
                <button
                  type="button"
                  className={styles.infoBtn}
                  onClick={() => setTimeInfoOpen(v => !v)}
                  onBlur={() => setTimeInfoOpen(false)}
                  aria-label="Comment ce chiffre est calculé"
                  aria-expanded={timeInfoOpen}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01M11 11h1v5h1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={`${styles.tooltip} ${timeInfoOpen ? styles.tooltipOpen : ''}`} role="tooltip">
                    {TIME_SAVED_METHOD_NOTE}
                  </span>
                </button>
              </div>
              <p className={styles.statSub}>
                {emailsPending ? '' : `sur ${todayEmailsCount} email${todayEmailsCount !== 1 ? 's' : ''} traité${todayEmailsCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <AIBanner />
        </div>

        <div className={styles.cols}>
          <TodayEssentials emails={emails} events={todayEvents} loading={emailsPending || eventsPending} />
          <AgendaTimeline events={todayEvents} loading={eventsPending} />
          <TasksCard />
        </div>
      </div>
    </AppLayout>
  )
}
