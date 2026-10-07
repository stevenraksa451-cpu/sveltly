'use client'
import { useState } from 'react'
import { CalendarEvent } from '@/types'
import styles from './CalendarView.module.css'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfWeek(iso: string) {
  const d = parseIso(iso)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - day)
  return d
}
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface Props {
  events: CalendarEvent[]
  selectedDate: string
  onSelectDate: (d: string) => void
  view: 'month' | 'week' | 'day'
  onViewChange: (v: 'month' | 'week' | 'day') => void
}

export default function CalendarView({ events, selectedDate, onSelectDate, view, onViewChange }: Props) {
  const today = new Date()
  const todayIso = today.toISOString().split('T')[0]

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const blanks = Array(firstDay).fill(null)
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function getEventsForIso(iso: string) {
    return events.filter(e => e.date === iso)
  }

  // --- Navigation, dépend de la vue active ---
  function goPrev() {
    if (view === 'month') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
      else setViewMonth(m => m - 1)
    } else if (view === 'week') {
      const d = parseIso(selectedDate)
      d.setDate(d.getDate() - 7)
      onSelectDate(toIso(d))
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    } else {
      const d = parseIso(selectedDate)
      d.setDate(d.getDate() - 1)
      onSelectDate(toIso(d))
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  function goNext() {
    if (view === 'month') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
      else setViewMonth(m => m + 1)
    } else if (view === 'week') {
      const d = parseIso(selectedDate)
      d.setDate(d.getDate() + 7)
      onSelectDate(toIso(d))
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    } else {
      const d = parseIso(selectedDate)
      d.setDate(d.getDate() + 1)
      onSelectDate(toIso(d))
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    onSelectDate(todayIso)
  }

  // --- Titre dynamique selon la vue ---
  function getTitle() {
    if (view === 'month') {
      return <>{MONTHS[viewMonth]} <span className={styles.year}>{viewYear}</span></>
    }
    if (view === 'week') {
      const start = startOfWeek(selectedDate)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const sameMonth = start.getMonth() === end.getMonth()
      return (
        <>
          {start.getDate()} {sameMonth ? '' : MONTHS_SHORT[start.getMonth()]}
          {' – '}
          {end.getDate()} {MONTHS_SHORT[end.getMonth()]}
          <span className={styles.year}> {end.getFullYear()}</span>
        </>
      )
    }
    const d = parseIso(selectedDate)
    return <>{DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()} {MONTHS[d.getMonth()]}<span className={styles.year}> {d.getFullYear()}</span></>
  }

  const weekStart = startOfWeek(selectedDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className={styles.card}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.todayBtn} onClick={goToday}>Aujourd'hui</button>
          <div className={styles.navBtns}>
            <button className={styles.navBtn} onClick={goPrev}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button className={styles.navBtn} onClick={goNext}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <h2 className={styles.monthTitle}>{getTitle()}</h2>
        </div>

        <div className={styles.viewSwitcher}>
          {(['month', 'week', 'day'] as const).map(v => (
            <button
              key={v}
              className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
              onClick={() => onViewChange(v)}
            >
              {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
            </button>
          ))}
        </div>
      </div>

      {/* VUE MOIS */}
      {view === 'month' && (
        <>
          <div className={styles.grid}>
            {DAYS.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
            {blanks.map((_, i) => <div key={`b${i}`} className={styles.blank} />)}
            {monthDays.map(day => {
              const iso = isoDate(viewYear, viewMonth, day)
              const dayEvents = getEventsForIso(iso)
              const isToday = iso === todayIso
              const isSelected = iso === selectedDate
              const dow = parseIso(iso).getDay()
              const isWeekend = dow === 0 || dow === 6

              return (
                <button
                  key={day}
                  className={`${styles.day} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isWeekend ? styles.weekend : ''}`}
                  onClick={() => onSelectDate(iso)}
                >
                  <span className={styles.dayNumber}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className={styles.eventPills}>
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={styles.eventPill} style={{ background: isSelected ? 'rgba(255,255,255,0.3)' : (e.color || 'var(--accent)') }} />
                      ))}
                      {dayEvents.length > 2 && <span className={styles.moreEvents}>+{dayEvents.length - 2}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className={styles.monthsBar}>
            {MONTHS_SHORT.map((m, i) => (
              <button key={m} className={`${styles.monthChip} ${i === viewMonth ? styles.monthChipActive : ''}`} onClick={() => setViewMonth(i)}>
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      {/* VUE SEMAINE */}
      {view === 'week' && (
        <div className={styles.weekGrid}>
          <div className={styles.weekHeaderRow}>
            <div className={styles.weekTimeCol} />
            {weekDays.map(d => {
              const iso = toIso(d)
              const isToday = iso === todayIso
              const isSelected = iso === selectedDate
              return (
                <button
                  key={iso}
                  className={`${styles.weekDayHeader} ${isSelected ? styles.weekDayHeaderSelected : ''}`}
                  onClick={() => onSelectDate(iso)}
                >
                  <span className={styles.weekDayName}>{DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                  <span className={`${styles.weekDayNumber} ${isToday ? styles.weekDayNumberToday : ''}`}>{d.getDate()}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.weekBody}>
            <div className={styles.weekTimeCol}>
              {HOURS.map(h => <div key={h} className={styles.weekHourLabel}>{h}:00</div>)}
            </div>
            {weekDays.map(d => {
              const iso = toIso(d)
              const dayEvents = getEventsForIso(iso)
              return (
                <div key={iso} className={styles.weekDayCol}>
                  {HOURS.map(h => <div key={h} className={styles.weekHourSlot} />)}
                  {dayEvents.map(e => {
                    const startMin = timeToMinutes(e.startTime) - HOURS[0] * 60
                    const endMin = timeToMinutes(e.endTime) - HOURS[0] * 60
                    const top = (startMin / 60) * 40
                    const height = Math.max(((endMin - startMin) / 60) * 40, 20)
                    return (
                      <div
                        key={e.id}
                        className={styles.weekEvent}
                        style={{ top, height, background: e.color || 'var(--accent)' }}
                        title={`${e.title} · ${e.startTime}–${e.endTime}`}
                      >
                        {e.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VUE JOUR */}
      {view === 'day' && (
        <div className={styles.dayViewGrid}>
          <div className={styles.dayTimeCol}>
            {HOURS.map(h => <div key={h} className={styles.weekHourLabel}>{h}:00</div>)}
          </div>
          <div className={styles.dayCol}>
            {HOURS.map(h => <div key={h} className={styles.weekHourSlot} />)}
            {getEventsForIso(selectedDate).map(e => {
              const startMin = timeToMinutes(e.startTime) - HOURS[0] * 60
              const endMin = timeToMinutes(e.endTime) - HOURS[0] * 60
              const top = (startMin / 60) * 44
              const height = Math.max(((endMin - startMin) / 60) * 44, 24)
              return (
                <div
                  key={e.id}
                  className={styles.dayEvent}
                  style={{ top, height, background: e.color || 'var(--accent)' }}
                >
                  <span className={styles.dayEventTitle}>{e.title}</span>
                  <span className={styles.dayEventTime}>{e.startTime}–{e.endTime}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}