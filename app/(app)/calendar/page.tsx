'use client'
// app/(app)/calendar/page.tsx
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CalendarView from '@/components/calendar/CalendarView'
import EventList from '@/components/calendar/EventList'
import UpcomingEvents from '@/components/calendar/UpcomingEvents'
import ReorganizeDayPanel from '@/components/calendar/ReorganizeDayPanel'
import { supabase } from '@/lib/supabase'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { CalendarEvent, Priority } from '@/types'
import styles from './calendar.module.css'

function CalendarContent() {
  const { events, loading, refresh } = useCalendarEvents()
  const searchParams = useSearchParams()
  // Ouvert depuis la palette de recherche (Cmd/Ctrl+K) via /calendar?date=<date> —
  // la sélection existante se fait par jour, pas par événement précis.
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0])
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  const [calendarConnected, setCalendarConnected] = useState(false)
  // Distinct de `calendarConnected` : une ligne calendar_accounts existe, mais
  // Google a définitivement refusé ses jetons. Sans cet état, repasser
  // simplement `calendarConnected` à false faisait DISPARAÎTRE toute la barre
  // de synchronisation — la panne devenait encore plus silencieuse qu'avant.
  const [calendarExpire, setCalendarExpire] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Réglage "Synchronisation automatique" (Paramètres > Agenda) : appelle
  // /api/calendar/import, qui importe les événements créés directement dans le
  // vrai Google Calendar (sens inverse de la copie faite à la création — voir
  // /api/calendar/events). Best-effort et silencieux en mode auto : sans
  // calendrier connecté, l'API renvoie simplement { imported: 0 }.
  async function syncFromGoogle(showMessage: boolean) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSyncing(true)
    const res = await fetch('/api/calendar/import', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json().catch(() => null)
    setSyncing(false)

    // La route a constaté que Google refuse les jetons et a déjà repassé
    // is_connected à false. On bascule l'affichage tout de suite, y compris
    // en synchro automatique (showMessage = false) : c'est précisément le cas
    // où l'utilisateur n'a rien demandé et doit quand même être prévenu.
    if (data?.disconnected) {
      setCalendarConnected(false)
      setCalendarExpire(true)
      return
    }

    if (data?.imported > 0) refresh()
    if (showMessage) {
      setSyncMessage(data?.imported > 0 ? `${data.imported} événement${data.imported > 1 ? 's' : ''} importé${data.imported > 1 ? 's' : ''}` : 'Déjà à jour')
      setTimeout(() => setSyncMessage(null), 3000)
    }
  }

  useEffect(() => {
    async function loadCalendarSettings() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [{ data: profile }, { data: account }] = await Promise.all([
        supabase.from('profiles').select('calendar_auto_sync').eq('id', user.id).single(),
        // `is_connected` est LU, plus filtré : au rechargement de la page, une
        // ligne filtrée se serait comportée comme une absence de ligne, et le
        // « connexion expirée » aurait disparu au premier F5 — l'utilisateur
        // serait revenu à un agenda muet.
        supabase.from('calendar_accounts').select('id, is_connected').eq('user_id', user.id).eq('provider', 'google').maybeSingle(),
      ])

      // Aucune ligne = jamais connecté. Une ligne à false = connexion morte,
      // à reconnecter. Les deux méritent un affichage différent.
      const connected = !!account?.is_connected
      const auto = profile?.calendar_auto_sync ?? true
      setCalendarConnected(connected)
      setCalendarExpire(!!account && !account.is_connected)
      setAutoSync(auto)

      if (connected && auto) syncFromGoogle(false)
    }
    loadCalendarSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toCalendarEvent(data: any): CalendarEvent {
    return {
      id: data.id,
      title: data.title,
      date: data.date,
      startTime: data.start_time?.slice(0, 5) || '09:00',
      endTime: data.end_time?.slice(0, 5) || '10:00',
      description: data.description,
      color: data.color,
      priority: data.priority || 'normal',
      origin: data.origin || 'inflo',
      hasAttendees: data.has_attendees ?? false,
      locked: data.locked ?? false,
      fromEmailId: data.from_email_id || undefined,
    }
  }

  // Passe par une route serveur (plutôt qu'un insert Supabase direct) pour
  // que l'événement soit aussi copié vers le vrai Google Calendar quand
  // l'utilisateur l'a connecté (voir /api/calendar/events et
  // lib/google-calendar-sync) — le déchiffrement du token ne doit jamais se
  // faire côté navigateur. Détecte aussi les conflits côté serveur
  // (priority-aware — voir lib/scheduling.ts) : si `force` n'est pas passé et
  // qu'un conflit existe, rien n'est écrit — le conflit est renvoyé tel quel
  // pour que EventList affiche ConflictPlanCard plutôt que d'échouer.
  async function postEvent(eventData: Record<string, any>): Promise<{ conflict: true; data: any } | { conflict: false; event: CalendarEvent }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Non connecté')

    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(eventData),
    })
    const json = await res.json()

    // Sans ce contrôle, un échec (réseau, validation, erreur serveur)
    // laissait le formulaire se fermer et se vider comme si l'événement avait
    // été enregistré — aucune erreur visible, aucune trace de ce qui a été
    // tapé. En lançant ici, EventList (l'appelant) garde le formulaire ouvert
    // et affiche l'erreur au lieu de réinitialiser silencieusement.
    if (!res.ok) throw new Error(json.error || 'Erreur lors de la création de l\'événement')
    if (json.conflict) return { conflict: true, data: json }
    if (!json.event) throw new Error('Erreur lors de la création de l\'événement')
    return { conflict: false, event: toCalendarEvent(json.event) }
  }

  async function handleAddEvent(eventData: {
    title: string
    date: string
    startTime: string
    endTime: string
    description?: string
    color: string
    priority: Priority
  }): Promise<{ status: 'created' } | { status: 'conflict'; data: any }> {
    const result = await postEvent(eventData)
    if (result.conflict) return { status: 'conflict', data: result.data }
    refresh((current: CalendarEvent[] = []) => [...current, result.event], { revalidate: false })
    return { status: 'created' }
  }

  // Appelé depuis ConflictPlanCard : "Utiliser ce créneau" (alternative) ou
  // "Garder l'heure d'origine quand même" — dans les deux cas l'utilisateur a
  // explicitement choisi un horaire précis ; on force l'écriture à CET
  // horaire sans repasser par la détection de conflit.
  async function handleForceAddEvent(pendingEvent: any, startTime: string, endTime: string) {
    const result = await postEvent({ ...pendingEvent, startTime, endTime, force: true })
    if (!result.conflict) {
      refresh((current: CalendarEvent[] = []) => [...current, result.event], { revalidate: false })
    }
  }

  // Appelé depuis ConflictPlanCard ("Réorganiser ma journée") ou
  // ReorganizeDayPanel ("Appliquer") : applique un plan déjà confirmé par
  // l'utilisateur via la route serveur partagée — jamais d'écriture directe
  // ici. Revalidation complète ensuite (plusieurs événements peuvent changer
  // d'horaire en une fois ; un correctif optimiste manuel serait plus
  // fragile qu'un simple refetch).
  async function applyArrangement(moves: { id: string; startTime: string; endTime: string }[], newEvent?: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Non connecté')

    const res = await fetch('/api/calendar/apply-arrangement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ moves, newEvent }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erreur lors de la réorganisation')
    if (Array.isArray(json.syncWarnings) && json.syncWarnings.length > 0) {
      console.warn('Avertissements de synchronisation Google:', json.syncWarnings)
    }
    await refresh()
  }

  async function handleApplyArrangementFromConflict(displaced: any[], pendingEvent: any) {
    await applyArrangement(
      displaced.map(d => ({ id: d.id, startTime: d.newStartTime, endTime: d.newEndTime })),
      pendingEvent
    )
  }

  // --- Bouton "Réorganiser ma journée" (sans nouvel événement — juste les
  // conflits déjà présents ce jour-là, ex: après un import Google) ---
  const [reorganizing, setReorganizing] = useState(false)
  const [reorganizePreview, setReorganizePreview] = useState<any[] | null>(null)
  const [applyingArrangement, setApplyingArrangement] = useState(false)

  async function handleOpenReorganize() {
    setReorganizing(true)
    setReorganizePreview(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/calendar/reorganize-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ date: selectedDate }),
      })
      const json = await res.json()
      setReorganizePreview(json.moves || [])
    } finally {
      setReorganizing(false)
    }
  }

  async function handleApplyReorganize(selected: { id: string; startTime: string; endTime: string }[]) {
    setApplyingArrangement(true)
    try {
      await applyArrangement(selected)
      setReorganizePreview(null)
    } finally {
      setApplyingArrangement(false)
    }
  }

  async function handleDeleteEvent(id: string) {
    const removed = events.find((e: CalendarEvent) => e.id === id)
    refresh((current: CalendarEvent[] = []) => current.filter(e => e.id !== id), { revalidate: false })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    // Sans ce contrôle, un échec serveur laissait l'événement retiré de
    // l'écran (suppression optimiste) alors qu'il existait toujours en
    // base — il ne réapparaissait qu'au hasard d'une revalidation ultérieure
    // (désactivée au focus ici), un incohérence déroutante pour l'utilisateur.
    if (!res.ok && removed) {
      refresh((current: CalendarEvent[] = []) => [...current, removed], { revalidate: false })
    }
  }

  const dayEvents = events.filter((e: CalendarEvent) => e.date === selectedDate)
  const totalThisMonth = events.filter((e: CalendarEvent) =>
    e.date.startsWith(selectedDate.slice(0, 7))
  ).length

  return (
    <AppLayout
      title="Agenda"
      subtitle={loading && events.length === 0 ? '' : `${totalThisMonth} événement${totalThisMonth !== 1 ? 's' : ''} ce mois`}
    >
      {/* Une seule barre d'outils. Il y en avait deux, empilées et de même
          dessin : deux bandeaux pleine largeur pour deux boutons, au-dessus
          d'un agenda à qui il manquait d'autant de hauteur. Le contexte du
          jour reste à gauche, les deux actions se regroupent à droite. */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarContext}>
          {dayEvents.length > 1 ? `${dayEvents.length} événements ce jour-là` : 'Agenda du jour sélectionné'}
        </span>

        <div className={styles.toolbarActions}>
          {calendarExpire && (
            /* La barre reste en place, mais ne propose plus de synchroniser :
               relancer un import ne peut que réechouer. Le seul geste utile
               est la reconnexion, alors c'est le seul qu'on propose. */
            <Link href="/settings?tab=agenda" className={styles.syncExpired}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              Connexion Google Calendar expirée — reconnecter
            </Link>
          )}

          {calendarConnected && (
            <>
              {/* Même emplacement pour l'état de synchro et pour le message
                  transitoire : la barre ne change pas de hauteur en passant
                  de l'un à l'autre. */}
              <span className={styles.syncMode}>
                {syncMessage || `Google Calendar — synchronisation ${autoSync ? 'automatique' : 'manuelle'}`}
              </span>
              <button className={styles.syncBtn} onClick={() => syncFromGoogle(true)} disabled={syncing}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={syncing ? styles.syncSpin : ''}>
                  <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                </svg>
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </button>
            </>
          )}

          <button className={styles.syncBtn} onClick={handleOpenReorganize} disabled={reorganizing}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            {reorganizing ? 'Analyse...' : 'Réorganiser ma journée'}
          </button>
        </div>
      </div>

      {reorganizePreview && (
        <ReorganizeDayPanel
          moves={reorganizePreview}
          busy={applyingArrangement}
          onApply={handleApplyReorganize}
          onClose={() => setReorganizePreview(null)}
        />
      )}

      <div className={styles.layout}>
        <div className={styles.calendarCol}>
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            view={view}
            onViewChange={setView}
          />
        </div>
        <div className={styles.eventCol}>
          <EventList
            events={dayEvents}
            date={selectedDate}
            loading={loading && events.length === 0}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            onForceAddEvent={handleForceAddEvent}
            onApplyArrangement={handleApplyArrangementFromConflict}
          />
        </div>
        <div className={styles.upcomingCol}>
          {!(loading && events.length === 0) && <UpcomingEvents events={events} />}
        </div>
      </div>
    </AppLayout>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarContent />
    </Suspense>
  )
}
