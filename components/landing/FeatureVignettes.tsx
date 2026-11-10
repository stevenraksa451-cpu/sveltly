// components/landing/FeatureVignettes.tsx
// Les quatre petites tuiles de la grille bento (03, 04, 06, 07) n'avaient
// qu'une icône et du texte, alors que leurs trois voisines portent un aperçu
// d'interface. Côte à côte, elles se lisaient comme des cartes inachevées.
//
// CHAQUE VIGNETTE MONTRE LE MÉCANISME, PAS UNE MÉTAPHORE.
// Une icône de cadenas n'apprend rien sur le cloisonnement des données ;
// deux couloirs dont les points ne se croisent jamais, si. C'est la même
// règle que pour les visuels des trois étapes plus haut dans la page.
//
// ⚠️ UN SEUL ÉLÉMENT BOUGE PAR VIGNETTE.
// Quatre animations côte à côte, chacune avec plusieurs pièces en mouvement,
// donneraient une grille qui grouille — et la page porte déjà deux boucles
// (l'aperçu du hero et la palette de recherche). Ici, le reste du dessin est
// fixe et sert de décor à un seul geste, lent, qui se rejoue rarement.
//
// Composants SERVEUR : aucun hook, animation entièrement en CSS, pour que
// app/LandingPage.tsx reste un composant serveur.
import styles from './FeatureVignettes.module.css'

/** 03 — Agenda : un créneau se pose dans le trou laissé libre. */
export function VignetteAgenda() {
  return (
    <div className={styles.vignette} aria-hidden="true">
      <div className={styles.dayCol}>
        {['9:00', '10:00', '11:00'].map(h => (
          <div key={h} className={styles.slotRow}>
            <span className={styles.hour}>{h}</span>
            <span className={styles.slotLine} />
          </div>
        ))}
        {/* Le rendez-vous détecté, qui vient se poser sur le créneau libre.
            Il occupe sa place en permanence : seules son opacité et sa
            translation bougent, jamais sa hauteur — une hauteur animée
            pousserait tout ce qui est dessous à chaque tour. */}
        <div className={styles.placedEvent}>
          <span className={styles.placedBar} />
          <span className={styles.placedText}>Réunion — 10:00</span>
        </div>
      </div>
    </div>
  )
}

/** 04 — Tâches : une phrase d'email devient une tâche cochable. */
export function VignetteTaches() {
  return (
    <div className={styles.vignette} aria-hidden="true">
      <p className={styles.quote}>
        « Pouvez-vous <span className={styles.highlight}>envoyer le devis</span> avant vendredi ? »
      </p>
      <div className={styles.taskRow}>
        <span className={styles.checkbox}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className={styles.taskText}>Envoyer le devis</span>
        <span className={styles.taskDue}>vendredi</span>
      </div>
    </div>
  )
}

/** 06 — Zéro distraction : le bruit s'efface, une seule ligne reste. */
export function VignetteFocus() {
  return (
    <div className={styles.vignette} aria-hidden="true">
      <div className={styles.noiseStack}>
        {['Promo −50 %', 'Newsletter', 'Notification'].map((n, i) => (
          <span key={n} className={styles.noise} style={{ animationDelay: `${i * 260}ms` }}>
            {n}
          </span>
        ))}
      </div>
      <div className={styles.kept}>
        <span className={styles.keptDot} />
        Devis à valider
      </div>
    </div>
  )
}

/** 07 — Données privées : deux comptes, deux couloirs, aucun croisement. */
export function VignetteCloison() {
  return (
    <div className={styles.vignette} aria-hidden="true">
      <div className={styles.lanes}>
        <div className={styles.lane}>
          <span className={styles.laneLabel}>Compte A</span>
          <span className={`${styles.dot} ${styles.dotA}`} />
          <span className={`${styles.dot} ${styles.dotA}`} />
          <span className={`${styles.dot} ${styles.dotA}`} />
        </div>
        {/* Le mur. Il ne bouge pas : c'est le point du dessin. */}
        <div className={styles.wall} />
        <div className={styles.lane}>
          <span className={styles.laneLabel}>Compte B</span>
          <span className={`${styles.dot} ${styles.dotB}`} />
          <span className={`${styles.dot} ${styles.dotB}`} />
          <span className={`${styles.dot} ${styles.dotB}`} />
        </div>
      </div>
      <p className={styles.laneFoot}>Une requête ne sort jamais de son couloir</p>
    </div>
  )
}
