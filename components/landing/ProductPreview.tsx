// components/landing/ProductPreview.tsx
// Aperçu du produit pour le hero de la landing — pas une capture d'écran,
// une reconstruction fidèle de la vraie boîte de réception Sveltly (mêmes
// tokens de couleur que components/inbox/*, mêmes libellés de priorité) et
// de la personnalisation du ton des réponses IA (mêmes 3 tons que
// Paramètres > Intelligence artificielle). Données 100% factices.
// Ainsi que la détection + placement automatique d'un rendez-vous dans
// l'agenda (lib/scheduling.ts), sans conflit avec les événements existants.
// Les trois cartes se parcourent en glissant (scroll-snap), comme un carrousel.
'use client'
import { useEffect, useRef, useState } from 'react'
import PriorityBadge from '@/components/ui/PriorityBadge'
import styles from './ProductPreview.module.css'

type Priority = 'urgent' | 'important' | 'normal'
type Tone = 'professional' | 'formal' | 'casual'

const SLIDES = ['Boîte de réception', 'Réponse IA', 'Agenda'] as const
const TABS = ['Tous', 'Urgent', 'Important'] as const

const AGENDA_ROWS: { hour: string; event: { title: string; time: string; location: string } | null }[] = [
  { hour: '12:00', event: null },
  { hour: '13:00', event: null },
  { hour: '14:00', event: { title: 'Réunion équipe marketing', time: '14:00 – 15:00', location: 'Salle B' } },
  { hour: '16:00', event: null },
]

const EMAILS: { id: number; initials: string; name: string; preview: string; priority: Priority }[] = [
  { id: 1, initials: 'ML', name: 'Marine Lecomte', preview: 'Pouvez-vous valider le devis avant vendredi ?', priority: 'urgent' },
  { id: 2, initials: 'TB', name: 'Thomas Bernard', preview: 'Réunion déplacée à 15h, salle B.', priority: 'important' },
  { id: 3, initials: 'CN', name: 'Camille Noël', preview: "Merci pour votre retour rapide sur le projet.", priority: 'normal' },
  { id: 4, initials: 'JD', name: 'Julien Dumont', preview: 'Facture n°2291 jointe, à régler sous 15 jours.', priority: 'important' },
  { id: 5, initials: 'SR', name: 'Sofia Ricci', preview: "Petit point sur l'avancement cette semaine ?", priority: 'normal' },
  { id: 6, initials: 'AK', name: 'Amine Kader', preview: 'Le client attend une réponse avant midi.', priority: 'urgent' },
]

const TONE_LABEL: Record<Tone, string> = {
  professional: 'Professionnel',
  formal: 'Formel',
  casual: 'Décontracté',
}

const REPLY_BY_TONE: Record<Tone, string> = {
  professional: "Bonjour Marine,\n\nLe devis est validé de mon côté. Je vous transmets la version signée d'ici vendredi, comme convenu.\n\nCordialement,",
  formal: "Bonjour Madame Lecomte,\n\nJe vous confirme la validation du devis transmis. Le document signé vous parviendra dans le délai imparti, avant vendredi.\n\nJe vous prie d'agréer, Madame, mes salutations distinguées.",
  casual: "Salut Marine,\n\nDevis validé de mon côté — je t'envoie la version signée avant vendredi comme prévu. Je te tiens au courant si besoin.\n\nÀ bientôt,",
}

export default function ProductPreview() {
  const [active, setActive] = useState(0)
  const [tone, setTone] = useState<Tone>('professional')
  const trackRef = useRef<HTMLDivElement>(null)

  function goTo(index: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
    setActive(index)
  }

  // Défilement automatique des 3 cartes — relancé à chaque changement de
  // `active` (donc aussi après un clic manuel sur un point), pour ne jamais
  // avancer une carte juste après que l'utilisateur en ait choisi une
  // lui-même.
  useEffect(() => {
    const timer = setTimeout(() => {
      goTo((active + 1) % SLIDES.length)
    }, 5000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    setActive(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className={styles.wrap} aria-label="Aperçu illustratif de l'interface Sveltly, avec des données d'exemple">
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
      >
        <div className={styles.slide}>
          <div className={styles.card}>
            <div className={styles.header}>
              <p className={styles.title}>Boîte de réception</p>
              <div className={styles.tabs}>
                {TABS.map((t, i) => (
                  <span key={t} className={`${styles.tab} ${i === 0 ? styles.tabActive : ''}`}>{t}</span>
                ))}
              </div>
            </div>

            <div className={styles.summary}>
              <span className={styles.summaryIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
                </svg>
              </span>
              <div>
                <p className={styles.summaryTitle}>Résumé du jour</p>
                <p className={styles.summaryText}>3 emails urgents, 2 réunions ajoutées à l'agenda automatiquement.</p>
              </div>
            </div>

            <div className={styles.list}>
              {EMAILS.map(e => (
                <div key={e.id} className={styles.row}>
                  <div className={styles.avatar}>{e.initials}</div>
                  <div className={styles.body}>
                    <p className={styles.sender}>{e.name}</p>
                    <p className={styles.preview}>{e.preview}</p>
                  </div>
                  <PriorityBadge priority={e.priority} size="sm" />
                </div>
              ))}
            </div>

            <div className={styles.toast}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Tâche créée
            </div>
          </div>
        </div>

        <div className={styles.slide}>
          <div className={styles.card}>
            <div className={styles.header}>
              <p className={styles.title}>Réponse à Marine Lecomte</p>
            </div>

            <div className={styles.quoted}>« Pouvez-vous valider le devis avant vendredi ? »</div>

            <p className={styles.toneLabel}>Ton de la réponse</p>
            <div className={styles.toneRow}>
              {(Object.keys(TONE_LABEL) as Tone[]).map(t => (
                <button
                  key={t}
                  className={`${styles.toneBtn} ${tone === t ? styles.toneActive : ''}`}
                  onClick={() => setTone(t)}
                >
                  {TONE_LABEL[t]}
                </button>
              ))}
            </div>

            <p className={styles.replyText}>{REPLY_BY_TONE[tone]}</p>

            <div className={styles.sendRow}>
              <span className={styles.sendReady}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Prêt à envoyer
              </span>
              <span className={styles.sendBtn}>Envoyer</span>
            </div>
          </div>
        </div>

        <div className={styles.slide}>
          <div className={styles.card}>
            <div className={styles.header}>
              <p className={styles.title}>Rendez-vous détecté</p>
              <span className={styles.detectedBadge}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
                </svg>
                Détecté par l'IA
              </span>
            </div>

            <div className={styles.quoted}>« Réunion avec l'équipe marketing demain à 14h, salle B. »</div>

            <p className={styles.toneLabel}>Aujourd'hui</p>
            <div className={styles.agenda}>
              {AGENDA_ROWS.map(row => (
                <div key={row.hour} className={styles.agendaRow}>
                  <span className={styles.agendaHour}>{row.hour}</span>
                  {row.event ? (
                    <div className={styles.agendaEvent}>
                      <p className={styles.agendaEventTitle}>{row.event.title}</p>
                      <p className={styles.agendaEventMeta}>{row.event.time} · {row.event.location}</p>
                    </div>
                  ) : (
                    <div className={styles.agendaEmpty} />
                  )}
                </div>
              ))}
            </div>
            <p className={styles.agendaNote}>Aucun conflit avec vos rendez-vous existants</p>

            <div className={styles.toast}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Ajouté à l'agenda
            </div>
          </div>
        </div>
      </div>

      <div className={styles.dots} role="tablist" aria-label="Choisir l'aperçu à afficher">
        {SLIDES.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={active === i}
            aria-label={label}
            className={`${styles.dot} ${active === i ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
