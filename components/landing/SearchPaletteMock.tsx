// components/landing/SearchPaletteMock.tsx
// La palette de recherche, en marche, dans la section sombre.
//
// POURQUOI CETTE IMAGE-LÀ
// Le texte à gauche affirme une chose vérifiable : « un email, une tâche, un
// rendez-vous, une page… elle cherche dans les données déjà chargées — pas
// d'attente réseau ». La moitié droite de la section était vide, avec deux
// touches ⌘K posées dans le vide. Montrer la palette qui rend trois types de
// résultats d'un seul coup PROUVE la phrase ; une illustration abstraite
// l'aurait seulement accompagnée.
//
// Composant SERVEUR : aucun hook, aucun état. L'animation est entièrement en
// CSS, donc `app/LandingPage.tsx` reste un composant serveur — voir le
// commentaire en tête de ce fichier-là.
//
// ⚠️ LA FRAPPE N'EST PAS ANIMÉE, ET C'EST VOULU.
// Simuler la saisie demanderait d'animer une largeur ou un `clip-path`
// calibré au caractère près. Animer une largeur est interdit ici (CLAUDE.md :
// jamais de propriété de mise en page), et surtout : ce n'est pas le sujet.
// Ce que la section promet, c'est que les résultats arrivent SANS ATTENTE.
// La requête est donc déjà là, le curseur clignote, et seuls les résultats
// entrent — décalés de 90 ms, le temps d'un rendu, pas d'un aller-retour.
import styles from './SearchPaletteMock.module.css'

const RESULTATS = [
  {
    type: 'Email',
    typeClass: 'chipEmail',
    titre: 'Devis à valider avant vendredi',
    meta: 'Marine Lecomte · 5 nov.',
    icone: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 8l10 6 10-6" />
      </svg>
    ),
  },
  {
    type: 'Tâche',
    typeClass: 'chipTask',
    titre: 'Envoyer le devis signé',
    meta: 'Échéance vendredi',
    icone: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    type: 'Agenda',
    typeClass: 'chipEvent',
    titre: 'Réunion — Marine Lecomte',
    meta: 'Demain, 14:00 – 15:00',
    icone: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
]

export default function SearchPaletteMock() {
  return (
    // aria-hidden : c'est une illustration. Son contenu est de la mise en
    // scène — des noms et une requête inventés — et il répète ce que le texte
    // à gauche dit déjà. Le faire lire par une synthèse vocale ajouterait du
    // bruit sans ajouter d'information.
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.panel}>
        <div className={styles.field}>
          <svg className={styles.fieldIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span className={styles.query}>devis</span>
          <span className={styles.caret} />
          <span className={styles.kbd}>⌘K</span>
        </div>

        <ul className={styles.results}>
          {RESULTATS.map((r, i) => (
            <li
              key={r.type}
              className={styles.result}
              // Le décalage se pose ici plutôt qu'en CSS : trois règles
              // nth-child pour une seule valeur qui varie, c'est trois fois
              // la même animation à maintenir.
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className={`${styles.icon} ${styles[r.typeClass]}`}>{r.icone}</span>
              <span className={styles.body}>
                <span className={styles.title}>{r.titre}</span>
                <span className={styles.meta}>{r.meta}</span>
              </span>
              <span className={`${styles.chip} ${styles[r.typeClass]}`}>{r.type}</span>
            </li>
          ))}
        </ul>

        <p className={styles.foot}>
          <span className={styles.footDot} />
          3 résultats — aucune requête réseau
        </p>
      </div>
    </div>
  )
}
