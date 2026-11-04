'use client'
import { useEffect, useState } from 'react'
import { CalendarEvent } from '@/types'
import styles from './UpcomingEvents.module.css'

/**
 * Une heure courante qui AVANCE.
 *
 * C'est la cause des événements déjà passés qui restaient affichés. `now`
 * était lu une fois, au rendu — et rien ne provoquait jamais de nouveau
 * rendu : la liste ne dépend d'aucun état, et useCalendarEvents est en
 * `revalidateOnFocus: false`, donc même revenir sur l'onglet ne relançait
 * rien. Une page laissée ouverte gardait donc indéfiniment la liste et les
 * étiquettes figées à l'heure de son chargement, « En cours » compris, des
 * heures après la fin de l'événement.
 *
 * Le réveil est calé sur la minute PLEINE, pas sur un intervalle de 60 s
 * depuis le montage : sinon une étiquette « Dans 3 min » peut rester fausse
 * jusqu'à 59 s. Et `visibilitychange` rattrape le retour d'onglet, où les
 * minuteries sont fortement ralenties par le navigateur.
 */
function useMinuteCourante(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let minuterie: ReturnType<typeof setTimeout>

    const planifier = () => {
      const msAvantLaMinute = 60000 - (Date.now() % 60000)
      minuterie = setTimeout(() => {
        setNow(Date.now())
        planifier()
      }, msAvantLaMinute + 50)
    }
    planifier()

    const auRetour = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', auRetour)

    return () => {
      clearTimeout(minuterie)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])

  return now
}

/**
 * Écart en JOURS DE CALENDRIER, pas en tranches de 24 h.
 *
 * L'ancien calcul faisait `Math.round(heures / 24)` : vu à 20 h, un événement
 * situé 30 h plus tard — donc le surlendemain à 2 h — tombait sur 1 et
 * s'affichait « Demain ». On compare maintenant les dates elles-mêmes, à
 * midi local pour que le passage à l'heure d'hiver ou d'été ne décale pas le
 * résultat d'un jour.
 */
function ecartEnJours(now: number, dateIso: string): number {
  const aujourdhui = new Date(now)
  const a = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate(), 12)
  const [annee, mois, jour] = dateIso.split('-').map(Number)
  const b = new Date(annee, mois - 1, jour, 12)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/**
 * Une date lisible, AVEC l'année quand ce n'est pas l'année en cours.
 *
 * « 14 oct. » sur un anniversaire récurrent importé pour l'an prochain se
 * lisait comme une date passée : la fenêtre d'import va jusqu'à J+365
 * (app/api/calendar/import), donc l'occurrence suivante d'un événement
 * annuel est bel et bien en base, et bel et bien à venir. Sans l'année,
 * rien ne permettait de le savoir.
 */
function dateLisible(now: number, d: Date): string {
  const memeAnnee = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(memeAnnee ? {} : { year: 'numeric' }),
  })
}

// Ce que l'import écrit pour un événement « toute la journée »
// (app/api/calendar/import : 00:00 → 23:59).
function estJourneeEntiere(startTime: string, endTime: string): boolean {
  return startTime === '00:00' && endTime === '23:59'
}

type Ton = 'urgent' | 'soon' | 'later' | 'planned'

function etiquette(
  event: CalendarEvent,
  now: number
): { text: string; tone: Ton } {
  const jours = ecartEnJours(now, event.date)
  const debut = new Date(`${event.date}T${event.startTime}:00`)
  const fin = new Date(`${event.date}T${event.endTime}:00`)

  const parJour = (): { text: string; tone: Ton } => {
    if (jours === 1) return { text: 'Demain', tone: 'later' }
    if (jours >= 2 && jours <= 6) {
      return { text: debut.toLocaleDateString('fr-FR', { weekday: 'long' }), tone: 'planned' }
    }
    return { text: dateLisible(now, debut), tone: 'planned' }
  }

  // Un événement sur toute la journée n'est pas « En cours » pendant 24 h —
  // l'étiquette ne voulait rien dire, et peignait en rouge un anniversaire.
  if (estJourneeEntiere(event.startTime, event.endTime)) {
    if (jours === 0) return { text: "Aujourd’hui", tone: 'soon' }
    return parJour()
  }

  if (now >= debut.getTime() && now <= fin.getTime()) {
    return { text: 'En cours', tone: 'urgent' }
  }

  const minutes = Math.round((debut.getTime() - now) / 60000)
  if (jours === 0) {
    if (minutes < 60) return { text: `Dans ${Math.max(minutes, 1)} min`, tone: 'urgent' }
    return { text: `Dans ${Math.round(minutes / 60)} h`, tone: 'soon' }
  }
  return parJour()
}

export default function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  const now = useMinuteCourante()

  const upcoming = [...events]
    .filter(e => new Date(`${e.date}T${e.endTime}:00`).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.startTime}:00`).getTime() -
        new Date(`${b.date}T${b.startTime}:00`).getTime()
    )
    .slice(0, 6)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Prochains événements</h3>
      </div>

      {upcoming.length === 0 ? (
        <div className={styles.empty}><p>Rien de prévu prochainement.</p></div>
      ) : (
        <div className={styles.list}>
          {upcoming.map(event => {
            const rel = etiquette(event, now)
            const color = event.color || '#2563EB'
            const journeeEntiere = estJourneeEntiere(event.startTime, event.endTime)
            return (
              <div key={event.id} className={styles.item} style={{ borderLeftColor: color }}>
                <div className={styles.itemIcon} style={{ background: `${color}1A`, color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTop}>
                    <p className={styles.itemTitle}>{event.title}</p>
                    <span className={`${styles.badge} ${styles[rel.tone]}`}>{rel.text}</span>
                  </div>
                  {event.description && <p className={styles.itemDesc}>{event.description}</p>}
                  <p className={styles.itemTime}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {/* « 00:00 – 23:59 » ne dit rien d'utile : c'est la
                        convention d'écriture d'une journée entière, pas un
                        horaire que l'utilisateur a choisi. */}
                    {journeeEntiere ? 'Toute la journée' : `${event.startTime} – ${event.endTime}`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
