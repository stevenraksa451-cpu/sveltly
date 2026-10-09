import styles from './Mocks.module.css'

// Maquettes d'interface construites en HTML/CSS, jamais des captures d'écran.
// Les données affichées sont volontairement génériques (prénoms courants,
// objets d'email neutres) : rien qui puisse passer pour un vrai client.

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.shell} aria-hidden="true">
      <div className={styles.shellBar}>
        <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
        <span className={styles.shellTitle}>{title}</span>
      </div>
      <div className={styles.shellBody}>{children}</div>
    </div>
  )
}

const ROWS = [
  { initials: 'ML', name: 'Marine L.', subject: 'Validation du devis avant vendredi ?', level: 'urgent' as const },
  { initials: 'TB', name: 'Thomas B.', subject: 'Réunion déplacée à 15h', level: 'important' as const },
  { initials: 'CN', name: 'Camille N.', subject: 'Merci pour votre retour', level: 'normal' as const },
  { initials: 'JD', name: 'Julien D.', subject: 'Facture n°2291 à régler', level: 'important' as const },
]

const LEVEL_LABEL = { urgent: 'Urgent', important: 'Important', normal: 'Normal' }

export function MockInbox() {
  return (
    <Shell title="Boîte de réception">
      <div className={styles.rows}>
        {ROWS.map(r => (
          <div key={r.initials} className={styles.row}>
            <span className={styles.avatar}>{r.initials}</span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>{r.name}</span>
              <span className={styles.rowSubject}>{r.subject}</span>
            </span>
            <span className={`${styles.badge} ${styles[r.level]}`}>{LEVEL_LABEL[r.level]}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function MockSummary() {
  return (
    <Shell title="Résumé du jour">
      <div className={styles.summaryCard}>
        <p className={styles.summaryLine}>Vous avez reçu une demande de validation de devis, à traiter avant vendredi.</p>
      </div>
      <div className={styles.summaryCard}>
        <p className={styles.summaryLine}>Une réunion a été déplacée à 15h — l’agenda a été mis à jour.</p>
      </div>
      <div className={styles.summaryCard}>
        <p className={styles.summaryLine}>Une facture de 1 240 € est à régler sous quinze jours.</p>
      </div>
    </Shell>
  )
}

export function MockReply() {
  return (
    <Shell title="Réponse proposée">
      <div className={styles.quoted}>« Pouvez-vous valider le devis avant vendredi ? »</div>
      <div className={styles.tones}>
        <span className={`${styles.tone} ${styles.toneActive}`}>Professionnel</span>
        <span className={styles.tone}>Formel</span>
        <span className={styles.tone}>Décontracté</span>
      </div>
      <p className={styles.replyText}>
        Bonjour Marine, le devis est validé de mon côté. Je vous transmets la version signée d’ici vendredi.
      </p>
      <div className={styles.replyActions}>
        <span className={styles.ghostBtn}>Modifier</span>
        <span className={styles.primaryBtn}>Envoyer</span>
      </div>
    </Shell>
  )
}

export function MockTasks() {
  const tasks = [
    { text: 'Envoyer le devis signé à Marine', due: 'Vendredi', done: false },
    { text: 'Régler la facture n°2291', due: '15 jours', done: false },
    { text: 'Confirmer la réunion de 15h', due: 'Aujourd’hui', done: true },
  ]
  return (
    <Shell title="Tâches">
      <div className={styles.rows}>
        {tasks.map(t => (
          <div key={t.text} className={styles.taskRow}>
            <span className={`${styles.check} ${t.done ? styles.checkDone : ''}`}>
              {t.done && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
            </span>
            <span className={`${styles.taskText} ${t.done ? styles.taskTextDone : ''}`}>{t.text}</span>
            <span className={styles.taskDue}>{t.due}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function MockAgenda() {
  return (
    <Shell title="Aujourd’hui">
      <div className={styles.agenda}>
        {['09:00', '11:00', '14:00', '16:00'].map(h => (
          <div key={h} className={styles.slot}>
            <span className={styles.slotTime}>{h}</span>
            <span className={styles.slotLine} />
          </div>
        ))}
        <div className={styles.event}>
          <span className={styles.eventTitle}>Réunion équipe produit</span>
          <span className={styles.eventMeta}>14:00 – 15:00 · détecté dans un email</span>
        </div>
      </div>
    </Shell>
  )
}

export function MockSecurity() {
  const rows = [
    { label: 'Lecture des emails', value: 'Autorisée', ok: true },
    { label: 'Envoi en votre nom', value: 'Après validation', ok: true },
    { label: 'Revente des données', value: 'Jamais', ok: false },
    { label: 'Entraînement d’un modèle', value: 'Jamais', ok: false },
  ]
  return (
    <Shell title="Permissions">
      <div className={styles.rows}>
        {rows.map(r => (
          <div key={r.label} className={styles.permRow}>
            <span className={styles.permLabel}>{r.label}</span>
            <span className={`${styles.permValue} ${r.ok ? styles.permOk : styles.permNever}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}
