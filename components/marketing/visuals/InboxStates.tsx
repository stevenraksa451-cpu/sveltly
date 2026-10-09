import styles from './InboxStates.module.css'

// Les deux états d'une même boîte. Même liste de messages dans les deux cas :
// c'est le classement qui change, pas le contenu — sinon la comparaison ne
// voudrait rien dire.
//
// Noms et objets clairement fictifs mais plausibles : une boîte de freelance
// un lundi matin.
const MESSAGES = [
  { from: 'Marine Lecomte', subject: 'Devis à valider avant vendredi', level: 'urgent' as const, time: '08:12' },
  { from: 'Newsletter Design', subject: 'Les 12 tendances du mois', level: 'normal' as const, time: '07:50' },
  { from: 'Hébergeur', subject: 'Votre facture est disponible', level: 'important' as const, time: '07:31' },
  { from: 'Promo Matériel', subject: '-40 % cette semaine seulement', level: 'normal' as const, time: '06:58' },
  { from: 'Thomas Bernard', subject: 'La réunion passe à 15 h', level: 'important' as const, time: '06:40' },
  { from: 'Supervision', subject: 'Site indisponible depuis 6 h 02', level: 'urgent' as const, time: '06:04' },
  { from: 'Camille Noël', subject: 'Merci pour votre retour', level: 'normal' as const, time: '05:47' },
]

const LEVEL_LABEL = { urgent: 'Urgent', important: 'Important', normal: 'Normal' }
const ORDER = { urgent: 0, important: 1, normal: 2 }

function Row({ m, showBadge }: { m: typeof MESSAGES[number]; showBadge: boolean }) {
  return (
    <div className={styles.row}>
      <span className={styles.time}>{m.time}</span>
      <span className={styles.from}>{m.from}</span>
      <span className={styles.subject}>{m.subject}</span>
      {showBadge && (
        <span className={`${styles.badge} ${styles[m.level]}`}>{LEVEL_LABEL[m.level]}</span>
      )}
    </div>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.head}>{title}</div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}

/** Boîte brute : tri par heure d'arrivée, rien d'autre. */
export function InboxBefore() {
  return (
    <Shell title="Boîte de réception — 7 messages">
      {MESSAGES.map(m => <Row key={m.subject} m={m} showBadge={false} />)}
    </Shell>
  )
}

/** Même boîte, regroupée par priorité. */
export function InboxAfter() {
  const sorted = [...MESSAGES].sort((a, b) => ORDER[a.level] - ORDER[b.level])
  const firstNormal = sorted.findIndex(m => m.level === 'normal')

  return (
    <Shell title="Boîte de réception — 7 messages, triés">
      {sorted.map((m, i) => (
        <div key={m.subject}>
          {/* Un filet sépare ce qui demande une décision de ce qui peut
              attendre. C'est la seule séparation du visuel, et elle porte
              tout le propos. */}
          {i === firstNormal && <div className={styles.divider}>Peut attendre ce soir</div>}
          <Row m={m} showBadge />
        </div>
      ))}
    </Shell>
  )
}
