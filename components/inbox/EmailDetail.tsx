'use client'
// components/inbox/EmailDetail.tsx
import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { Email } from '@/types'
import { supabase } from '@/lib/supabase'
import { Tone, TONES, TONE_LABEL, resolveToneLabel, ReplyLanguage, REPLY_LANGUAGES, REPLY_LANGUAGE_LABEL, resolveReplyLanguage } from '@/lib/tone'
import PriorityBadge from '@/components/ui/PriorityBadge'
import UsageLimitCard from '@/components/ui/UsageLimitCard'
import ConflictPlanCard from '@/components/calendar/ConflictPlanCard'
import styles from './EmailDetail.module.css'

export default function EmailDetail({ email, onClose, onArchive }: { email: Email; onClose: () => void; onArchive?: () => void }) {
  const isArchived = email.labelIds?.includes('INBOX') === false
  const [replyText, setReplyText] = useState(email.aiDraftReply || '')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const [replyLimitInfo, setReplyLimitInfo] = useState<{ current: number; max: number } | null>(null)
  // Compte à rebours (en secondes) avant de pouvoir régénérer à nouveau,
  // quand Groq est en rate limit avec un délai exploitable — null = pas de
  // limite en cours, le bouton Régénérer reste normalement actif.
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null)
  const [showReply, setShowReply] = useState(!!email.hasAIReply)
  const [eventSaved, setEventSaved] = useState(false)
  const [eventError, setEventError] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)
  // Conflit détecté par le serveur (voir /api/calendar/schedule-from-email) —
  // tant que ceci n'est pas null, ConflictPlanCard remplace le bouton
  // "Enregistrer" ; rien n'est écrit en base avant que l'utilisateur ait
  // explicitement choisi une des options proposées.
  const [eventConflict, setEventConflict] = useState<any | null>(null)
  const [resolvingConflict, setResolvingConflict] = useState(false)
  const [eventTitle, setEventTitle] = useState(
    email.detectedEvent?.title || email.subject
  )
  const [eventDate, setEventDate] = useState(
    email.detectedEvent?.date || new Date().toISOString().split('T')[0]
  )
  const [eventStart, setEventStart] = useState(
    email.detectedEvent?.startTime || '09:00'
  )
  const [eventEnd, setEventEnd] = useState(
    email.detectedEvent?.endTime || '10:00'
  )
  const [selectedTone, setSelectedTone] = useState<Tone>('professional')
  // Langue de CETTE réponse précise — ponctuelle, jamais mémorisée par
  // contact (contrairement au ton) : initialisée au réglage global du
  // profil, mais un changement ici ne modifie que cette régénération.
  const [selectedLanguage, setSelectedLanguage] = useState<ReplyLanguage>('fr')
  const [rememberContact, setRememberContact] = useState(false)

  // Ton pré-sélectionné pour cet email : le ton mémorisé pour cet expéditeur
  // s'il existe, sinon le ton global du profil — même priorité que le backend.
  useEffect(() => {
    let active = true
    async function loadResolvedTone() {
      // getSession() : ce hook tourne à CHAQUE ouverture d'email (le
      // composant est remonté par email, voir key={selected.id} dans
      // inbox/page.tsx) — un aller-retour réseau ici à chaque clic sur un
      // email pèse directement sur la fluidité perçue de la boîte de réception.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const [{ data: profile }, { data: contact }] = await Promise.all([
        supabase.from('profiles').select('reply_tone, reply_language').eq('id', user.id).single(),
        supabase.from('contacts').select('reply_tone').eq('user_id', user.id).eq('email', email.senderEmail.toLowerCase()).maybeSingle(),
      ])
      if (!active) return
      setSelectedTone(resolveToneLabel(contact?.reply_tone ?? profile?.reply_tone))
      setSelectedLanguage(resolveReplyLanguage(profile?.reply_language))
    }
    loadResolvedTone()
    return () => { active = false }
  }, [email.senderEmail])

  // Décrémente le compte à rebours d'1 seconde jusqu'à 0, puis s'arrête tout
  // seul — le bouton Régénérer se réactive automatiquement à ce moment-là
  // (voir son `disabled`), sans que l'utilisateur ait besoin de recharger.
  useEffect(() => {
    if (rateLimitSeconds === null || rateLimitSeconds <= 0) return
    const timeout = setTimeout(() => {
      setRateLimitSeconds(s => (s !== null ? s - 1 : null))
    }, 1000)
    return () => clearTimeout(timeout)
  }, [rateLimitSeconds])

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(200)

  const cleanHtml = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, {
        ADD_ATTR: ['target'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      })
    : null

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const resize = () => {
      const doc = iframe.contentDocument
      if (doc?.body) setIframeHeight(doc.body.scrollHeight + 20)
    }
    iframe.addEventListener('load', resize)
    return () => iframe.removeEventListener('load', resize)
  }, [cleanHtml])

  // Passe par la même route serveur que InboxSidePanel (voir
  // /api/calendar/schedule-from-email) plutôt qu'un insert Supabase direct —
  // l'ancien code ici ne détectait aucun conflit ET ne synchronisait jamais
  // vers Google Calendar, alors que le bouton équivalent du panneau latéral
  // (visible en même temps, à droite) fait les deux. Un même email ne doit
  // pas se comporter différemment selon le bouton utilisé.
  async function handleSaveEvent(forceSlot?: { startTime: string; endTime: string }) {
    setEventError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setEventError('Non connecté'); return }

    const res = await fetch('/api/calendar/schedule-from-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        title: eventTitle,
        date: eventDate,
        startTime: eventStart,
        endTime: eventEnd,
        sourceSubject: email.subject,
        sourceEmailId: email.id,
        priority: email.priority,
        forceSlot,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      // Sans ce retour, le bouton "Enregistrer" ne faisait rien de visible en
      // cas d'échec — l'utilisateur ne pouvait pas savoir que rien n'avait
      // été sauvegardé.
      setEventError(json.error || 'Erreur lors de l\'enregistrement')
      return
    }
    if (json.status === 'created') {
      setEventConflict(null)
      setEventSaved(true)
      setShowEventForm(false)
      setTimeout(() => setEventSaved(false), 3000)
      return
    }
    setEventConflict(json)
  }

  async function handleReorganizeEventConflict() {
    if (!eventConflict) return
    setResolvingConflict(true)
    setEventError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setEventError('Non connecté'); return }

      const res = await fetch('/api/calendar/apply-arrangement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          moves: eventConflict.displaced.map((d: any) => ({ id: d.id, startTime: d.newStartTime, endTime: d.newEndTime })),
          newEvent: eventConflict.pendingEvent,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setEventError(json.error || 'Erreur lors de la réorganisation'); return }

      setEventConflict(null)
      setEventSaved(true)
      setShowEventForm(false)
      setTimeout(() => setEventSaved(false), 3000)
    } finally {
      setResolvingConflict(false)
    }
  }

  async function handleSend() {
    if (!replyText.trim()) return
    setSending(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Non connecté'); setSending(false); return }

    const res = await fetch('/api/send-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        to: email.senderEmail,
        subject: `Re: ${email.subject}`,
        body: replyText,
        threadId: email.threadId,
      })
    })

    const data = await res.json()
    if (res.ok) {
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } else {
      setError(data.error || 'Erreur lors de l\'envoi')
    }
    setSending(false)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError('')
    setReplyLimitInfo(null)
    setRateLimitSeconds(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Non connecté'); setRegenerating(false); return }

      const res = await fetch('/api/regenerate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, tone: selectedTone, language: selectedLanguage, rememberForContact: rememberContact })
      })
      const data = await res.json()
      if (res.ok) {
        setReplyText(data.reply || email.aiDraftReply || '')
      } else if (data.limitReached) {
        setReplyLimitInfo({ current: data.current, max: data.max })
      } else if (data.error === 'rate_limit') {
        // retryAfterSeconds peut être null si Groq a changé son format de
        // message — dans ce cas on retombe sur le message générique plutôt
        // que d'afficher un compte à rebours inventé.
        if (typeof data.retryAfterSeconds === 'number') {
          setRateLimitSeconds(data.retryAfterSeconds)
        } else {
          setError('La régénération a échoué, réessayez.')
        }
      } else {
        setError(data.error || 'Erreur lors de la régénération')
      }
    } catch {
      setError('Erreur lors de la régénération')
    }
    setRegenerating(false)
  }

  function formatRetryDelay(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `Réessaie dans ${minutes} min ${secs}s.`
  }

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.senderRow}>
            <div className={styles.avatar}>
              {email.sender.charAt(0).toUpperCase()}
            </div>
            <div className={styles.senderInfo}>
              <span className={styles.senderName}>{email.sender}</span>
              <span className={styles.senderEmail}>{email.senderEmail}</span>
            </div>
          </div>
          <div className={styles.headerMeta}>
            <PriorityBadge priority={email.priority} />
            <span className={styles.date}>
              {new Date(email.receivedAt).toLocaleString('fr-FR', {
                day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        <h2 className={styles.subject}>{email.subject}</h2>

        {email.calendarEventDetected && (
          <div className={styles.eventBanner}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {email.autoScheduled ? 'Événement ajouté automatiquement à l\'agenda' : 'Événement détecté dans cet email'}
          </div>
        )}

        {email.schedulingStatus === 'plan_limit' && (
          <a href="/settings?tab=billing" className={styles.planLimitBanner}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5 7 12l5-8 5 8 4.5-2.5L20 19H4z"/></svg>
            Le forfait Gratuit planifie automatiquement jusqu'à 7 jours à l'avance — passez à Pro pour une planification sans limite de délai
          </a>
        )}
      </div>

      {/* Corps */}
      <div className={styles.body}>
        {cleanHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={`
              <html>
                <head>
                  <base target="_blank" />
                  <style>
                    body {
                      font-family: -apple-system, 'Segoe UI', sans-serif;
                      font-size: 14px;
                      color: #1A1A1A;
                      line-height: 1.6;
                      margin: 0;
                      padding: 0;
                      word-wrap: break-word;
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: #1A73E8; }
                  </style>
                </head>
                <body>${cleanHtml}</body>
              </html>
            `}
            sandbox="allow-same-origin allow-popups"
            className={styles.emailFrame}
            style={{ height: iframeHeight }}
            title="Contenu de l'email"
          />
        ) : (
          <p className={styles.bodyText}>{email.body}</p>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${showReply ? styles.actionBtnActive : ''}`}
          onClick={() => setShowReply(!showReply)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {showReply ? 'Masquer la réponse' : 'Réponse IA'}
        </button>

        <button
          className={`${styles.actionBtn} ${showEventForm ? styles.actionBtnActive : ''} ${(eventSaved || email.autoScheduled) ? styles.actionBtnSaved : ''}`}
          onClick={() => { if (!email.autoScheduled) { setShowEventForm(!showEventForm); setEventConflict(null); setEventError('') } }}
          disabled={email.autoScheduled}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          {email.autoScheduled ? 'Ajouté automatiquement' : eventSaved ? 'Ajouté à l\'agenda' : 'Ajouter à l\'agenda'}
        </button>

        <button className={styles.actionBtn} onClick={onArchive} disabled={!onArchive}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          {isArchived ? 'Désarchiver' : 'Archiver'}
        </button>
      </div>

      {/* Formulaire ajout agenda */}
      {showEventForm && (
        <div className={styles.eventForm}>
          <p className={styles.eventFormTitle}>Ajouter à l'agenda</p>
          <div className={styles.eventFields}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Titre</label>
              <input
                className={styles.fieldInput}
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="Titre de l'événement"
                disabled={!!eventConflict}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Date</label>
              <input
                className={styles.fieldInput}
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                disabled={!!eventConflict}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Début</label>
                <input
                  className={styles.fieldInput}
                  type="time"
                  value={eventStart}
                  onChange={e => setEventStart(e.target.value)}
                  disabled={!!eventConflict}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Fin</label>
                <input
                  className={styles.fieldInput}
                  type="time"
                  value={eventEnd}
                  onChange={e => setEventEnd(e.target.value)}
                  disabled={!!eventConflict}
                />
              </div>
            </div>
          </div>
          {eventError && <p className={styles.errorMsg}>{eventError}</p>}

          {eventConflict ? (
            <ConflictPlanCard
              requestedStartTime={eventConflict.requested.startTime}
              conflictsCount={eventConflict.conflicts.length}
              alternative={eventConflict.alternative}
              displaced={eventConflict.displaced || []}
              atRiskOthers={eventConflict.atRiskOthers || []}
              busy={resolvingConflict}
              onAcceptAlternative={eventConflict.alternative ? () => handleSaveEvent(eventConflict.alternative) : undefined}
              onReorganize={(eventConflict.displaced || []).length > 0 ? handleReorganizeEventConflict : undefined}
              onKeepAnyway={() => handleSaveEvent(eventConflict.requested)}
              onCancel={() => { setEventConflict(null); setShowEventForm(false); setEventError('') }}
            />
          ) : (
            <div className={styles.eventFormActions}>
              <button
                className={styles.regenerateBtn}
                onClick={() => { setShowEventForm(false); setEventError('') }}
              >
                Annuler
              </button>
              <button
                className={styles.sendBtn}
                onClick={() => handleSaveEvent()}
                disabled={!eventTitle || !eventDate}
              >
                Enregistrer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panneau réponse IA */}
      {showReply && (
        <div className={styles.replyPanel}>
          <div className={styles.replyHeader}>
            <div className={styles.replyTitle}>
              <div className={styles.aiBadge}>IA</div>
              <span>Réponse générée</span>
            </div>
            <span className={styles.replyNote}>Modifiable avant envoi</span>
          </div>

          <div className={styles.toneRow}>
            <span className={styles.toneRowLabel}>Ton</span>
            <div className={styles.toneSegmented}>
              {TONES.map(t => (
                <button
                  key={t}
                  className={`${styles.toneSegBtn} ${selectedTone === t ? styles.toneSegActive : ''}`}
                  onClick={() => setSelectedTone(t)}
                  type="button"
                >
                  {TONE_LABEL[t]}
                </button>
              ))}
            </div>
            <span className={styles.toneRowLabel}>Langue</span>
            <div className={styles.toneSegmented}>
              {REPLY_LANGUAGES.map(l => (
                <button
                  key={l}
                  className={`${styles.toneSegBtn} ${selectedLanguage === l ? styles.toneSegActive : ''}`}
                  onClick={() => setSelectedLanguage(l)}
                  type="button"
                >
                  {REPLY_LANGUAGE_LABEL[l]}
                </button>
              ))}
            </div>
            <label className={styles.rememberContact}>
              <input
                type="checkbox"
                checked={rememberContact}
                onChange={e => setRememberContact(e.target.checked)}
              />
              Mémoriser pour {email.sender.split(' ')[0]}
            </label>
          </div>

          <textarea
            className={styles.textarea}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={6}
            placeholder="La réponse IA apparaîtra ici..."
          />

          {rateLimitSeconds !== null && rateLimitSeconds > 0 ? (
            <div className={styles.rateLimitNotice}>
              <p className={styles.rateLimitTitle}>Limite quotidienne de l'IA atteinte.</p>
              <p className={styles.rateLimitCountdown}>{formatRetryDelay(rateLimitSeconds)}</p>
            </div>
          ) : (
            error && <p className={styles.errorMsg}>{error}</p>
          )}

          {replyLimitInfo && (
            <UsageLimitCard
              title="Limite de réponses IA atteinte"
              message={`Vous avez utilisé vos ${replyLimitInfo.max} réponses IA du mois. Passez à Pro pour continuer à en générer sans limite.`}
              current={replyLimitInfo.current}
              max={replyLimitInfo.max}
              compact
            />
          )}

          <div className={styles.replyActions}>
            <button
              className={styles.regenerateBtn}
              onClick={handleRegenerate}
              disabled={regenerating || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
            >
              {regenerating ? 'Génération...' : 'Régénérer'}
            </button>
            <button
              className={`${styles.sendBtn} ${sent ? styles.sent : ''}`}
              onClick={handleSend}
              disabled={sent || sending || !replyText.trim()}
            >
              {sending ? 'Envoi...' : sent ? 'Envoyé' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}