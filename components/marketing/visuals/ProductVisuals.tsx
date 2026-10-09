'use client'
import { useInViewLoop } from '../useInViewLoop'
import styles from './ProductVisuals.module.css'

// Quatre visuels qui partagent le même châssis (cadre clair, bordure fine) et
// la même règle : une seule chose bouge à la fois, lentement. Regroupés dans
// un fichier parce qu'ils partagent ce châssis — pas parce qu'ils font la
// même chose.

function Frame({ title, children, loopRef }: {
  title: string
  children: React.ReactNode
  // React.Ref et non RefObject : useRef<T>(null) produit un
  // RefObject<T | null>, que RefObject<T> refuse.
  loopRef: React.Ref<HTMLDivElement>
}) {
  return (
    <div className={styles.frame} ref={loopRef} aria-hidden="true">
      <div className={styles.frameHead}>{title}</div>
      <div className={styles.frameBody}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ Résumé */
// Le résumé s'écrit ligne par ligne. L'effet "machine à écrire" passe par une
// largeur animée de 0 à 100 % sur un masque, pas par du JS qui ajoute des
// caractères : aucun re-rendu, et le texte reste sélectionnable et lisible
// par un lecteur d'écran dès le départ.
const SUMMARY_LINES = [
  'Marine attend votre devis signé avant vendredi.',
  'La réunion de jeudi passe de 11 h à 15 h.',
  'Une facture de 1 240 € arrive à échéance le 20.',
]

export function SummaryVisual() {
  const ref = useInViewLoop<HTMLDivElement>()
  return (
    <Frame title="Résumé du jour" loopRef={ref}>
      <div className={styles.summary}>
        {SUMMARY_LINES.map((line, i) => (
          <p key={line} className={styles.summaryLine} style={{ '--d': i } as React.CSSProperties}>
            <span className={styles.summaryText}>{line}</span>
          </p>
        ))}
      </div>
    </Frame>
  )
}

/* ------------------------------------------------------------------- Tâches */
// Les tâches se cochent une à une puis remontent. Le mouvement illustre le
// tri par échéance, pas un simple effet de coche.
const TASKS = [
  { text: 'Envoyer le devis signé à Marine', due: 'vendredi' },
  { text: 'Régler la facture n° 2291', due: 'le 20' },
  { text: 'Confirmer la réunion de jeudi', due: 'demain' },
]

export function TasksVisual() {
  const ref = useInViewLoop<HTMLDivElement>()
  return (
    <Frame title="Tâches extraites" loopRef={ref}>
      <div className={styles.tasks}>
        {TASKS.map((task, i) => (
          <div key={task.text} className={styles.task} style={{ '--d': i } as React.CSSProperties}>
            <span className={styles.check}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </span>
            <span className={styles.taskText}>{task.text}</span>
            <span className={styles.taskDue}>{task.due}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* ------------------------------------------------------------------ Agenda */
// Les blocs se posent sur une journée. Le bloc prioritaire arrive en premier
// et prend son créneau ; le second se place ensuite, autour.
const SLOTS = ['9 h', '11 h', '14 h', '16 h']

export function AgendaVisual() {
  const ref = useInViewLoop<HTMLDivElement>()
  return (
    <Frame title="Mardi" loopRef={ref}>
      <div className={styles.agenda}>
        {SLOTS.map(slot => (
          <div key={slot} className={styles.slot}>
            <span className={styles.slotTime}>{slot}</span>
            <span className={styles.slotLine} />
          </div>
        ))}
        <div className={`${styles.block} ${styles.blockFirst}`}>
          <span className={styles.blockTitle}>Point client</span>
          <span className={styles.blockMeta}>détecté dans un email</span>
        </div>
        <div className={`${styles.block} ${styles.blockSecond}`}>
          <span className={styles.blockTitle}>Relecture du devis</span>
        </div>
      </div>
    </Frame>
  )
}

/* ---------------------------------------------------------------- Réponses */
// Le ton sélectionné défile, et le brouillon change avec lui. Les trois
// versions sont empilées et révélées à tour de rôle : le texte reste présent
// dans le DOM, donc accessible, même pendant l'animation.
const DRAFTS = [
  { tone: 'Professionnel', text: 'Bonjour Marine, le devis est validé de mon côté. Je vous envoie la version signée avant vendredi.' },
  { tone: 'Formel', text: 'Bonjour Madame Lecomte, je vous confirme la validation du devis. La version signée vous parviendra avant vendredi.' },
  { tone: 'Décontracté', text: 'Salut Marine, devis validé — je t’envoie la version signée avant vendredi.' },
]

export function ReplyVisual() {
  const ref = useInViewLoop<HTMLDivElement>()
  return (
    <Frame title="Réponse proposée" loopRef={ref}>
      <p className={styles.quoted}>« Pouvez-vous valider le devis avant vendredi ? »</p>
      <div className={styles.tones}>
        {DRAFTS.map((d, i) => (
          <span key={d.tone} className={styles.tone} style={{ '--d': i } as React.CSSProperties}>
            {d.tone}
          </span>
        ))}
      </div>
      <div className={styles.drafts}>
        {DRAFTS.map((d, i) => (
          <p key={d.tone} className={styles.draft} style={{ '--d': i } as React.CSSProperties}>
            {d.text}
          </p>
        ))}
      </div>
    </Frame>
  )
}
