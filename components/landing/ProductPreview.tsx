// Visuel du hero — reconstruction de la vraie interface Sveltly dans un cadre
// de fenêtre, pas une capture d'écran : mêmes tokens de couleur que
// components/inbox/*, mêmes libellés de priorité, même vocabulaire.
// Données factices, et elles se répondent : l'email dit « demain à 14 h »,
// l'agenda affiche « Demain » et pose le créneau à 14:00 sur un axe horaire
// continu. Un visuel dont les données se contredisent se remarque, et il
// signale que personne n'a regardé.
//
// Composant SERVEUR, sans état : la séquence est entièrement en CSS
// (animation-delay en cascade). Pas de JavaScript à télécharger ni à
// hydrater avant que le plus gros élément de la page s'affiche — c'est le
// LCP de la page d'accueil qui se joue ici.
//
// Chaque keyframe se TERMINE sur l'état visible. Sous
// `prefers-reduced-motion`, la règle globale réduit la durée à ~0 : la scène
// s'affiche alors complète et figée, et non vide.

import Kbd from '@/components/ui/Kbd'
import styles from './ProductPreview.module.css'

const HEURES = ['12:00', '13:00', '14:00', '15:00', '16:00']

export default function ProductPreview() {
  return (
    <div className={styles.scene}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      {/* Le visuel est décoratif : il illustre une interface décrite en toutes
          lettres dans le texte du hero. Un lecteur d'écran qui énumérerait
          ces faux emails n'y gagnerait rien. */}
      <div className={styles.window} role="img" aria-label="Aperçu de l’interface Sveltly : un email est trié, résumé, et le rendez-vous qu’il contient est ajouté à l’agenda.">
        <div className={styles.titlebar} aria-hidden="true">
          <span className={styles.dots}>
            <i /><i /><i />
          </span>
          <span className={styles.titlebarLabel}>Boîte de réception</span>
          <span className={styles.titlebarKbd}><Kbd>⌘K</Kbd></span>
        </div>

        <div className={styles.body} aria-hidden="true">
          <div className={styles.listHead}>
            <span className={styles.listTitle}>Aujourd’hui</span>
            <span className={styles.listMeta}>3 messages</span>
          </div>

          {/* 1 · l'email arrive — 2 · l'IA l'étiquette — 3 · le résumé tombe */}
          <div className={`${styles.row} ${styles.rowNew}`}>
            <span className={styles.avatar}>ML</span>
            <div className={styles.rowBody}>
              <p className={styles.sender}>Marine Lecomte</p>
              <p className={styles.preview}>Peut-on caler la réunion demain à 14 h ?</p>
              <p className={styles.summary}>
                <span className={styles.summaryTag}>Résumé</span>
                {/* Le texte DOIT porter son propre élément : `.summary` est un
                    conteneur flex, et `text-overflow: ellipsis` ne s'applique
                    pas à un conteneur flex — le texte y était un élément flex
                    anonyme, coupé au milieu d'une lettre et sans points de
                    suspension. C'est sur CE span que la troncature opère. */}
                <span className={styles.summaryTexte}>
                  Demande de rendez-vous, à confirmer aujourd’hui.
                </span>
              </p>
            </div>
            <span className={styles.label}>Important</span>
          </div>

          <div className={styles.row}>
            <span className={styles.avatar}>TB</span>
            <div className={styles.rowBody}>
              <p className={styles.sender}>Thomas Bernard</p>
              <p className={styles.preview}>Facture n° 2291 jointe, à régler sous 15 jours.</p>
            </div>
            <span className={`${styles.label} ${styles.labelMuted}`}>Normal</span>
          </div>

          <div className={styles.row}>
            <span className={styles.avatar}>CN</span>
            <div className={styles.rowBody}>
              <p className={styles.sender}>Camille Noël</p>
              <p className={styles.preview}>Merci pour votre retour rapide sur le projet.</p>
            </div>
            <span className={`${styles.label} ${styles.labelMuted}`}>Normal</span>
          </div>

          {/* 4 · le rendez-vous détecté glisse dans l'agenda */}
          <div className={styles.agenda}>
            <div className={styles.agendaHead}>
              <span className={styles.agendaDay}>Demain</span>
              <span className={styles.agendaMeta}>détecté dans l’email</span>
            </div>
            <div className={styles.agendaGrid}>
              {HEURES.map(h => (
                <div key={h} className={styles.hourRow}>
                  <span className={styles.hour}>{h}</span>
                  <span className={styles.hourLine} />
                </div>
              ))}
              <div className={styles.event}>
                <p className={styles.eventTitle}>Réunion — Marine Lecomte</p>
                <p className={styles.eventTime}>14:00 – 15:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5 · la confirmation */}
        <span className={styles.toast} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
          Ajouté à l’agenda
        </span>
      </div>
    </div>
  )
}
