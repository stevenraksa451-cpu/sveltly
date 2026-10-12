import { SOCIAL_LINKS } from '@/lib/brand'
import styles from './SocialLinks.module.css'

// Icônes des comptes de la marque, dans la barre du haut.
//
// SVG en ligne, pas de bibliothèque d'icônes : c'est la règle du projet (voir
// CLAUDE.md), et quatre glyphes ne justifient pas 40 Ko de dépendance.
//
// Monochrome, à la couleur du texte — « mode sobre » : ces icônes sont une
// commodité, pas un argument. Elles ne doivent pas rivaliser avec le seul
// élément coloré de la barre, le bouton d'inscription.
//
// Tant qu'une URL est vide dans lib/brand.ts, l'icône correspondante est
// rendue en <span> inerte plutôt qu'en lien : visible, mais impossible à
// cliquer dans le vide. Remplir l'URL suffit à la rendre active.

const GLYPHES: Record<string, React.ReactNode> = {
  X: (
    <path d="M17.53 3h3.08l-6.73 7.69L21.8 21h-6.2l-4.86-6.36L5.18 21H2.1l7.2-8.23L2.2 3h6.36l4.39 5.81zm-1.08 16.15h1.71L7.63 4.76H5.8z" />
  ),
  Instagram: (
    <>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.1" cy="6.9" r="1.15" />
    </>
  ),
  TikTok: (
    <path d="M16.6 2h-3.1v13.2a2.5 2.5 0 1 1-2.1-2.47V9.6a5.6 5.6 0 1 0 5.2 5.59V8.76a6.6 6.6 0 0 0 3.9 1.26V6.9a3.52 3.52 0 0 1-3.9-3.4z" />
  ),
  // Le disque plein de la marque Facebook pèse deux fois ses voisins dans une
  // rangée de 16 px : il attire l'œil le premier alors que c'est la dernière
  // icône. Cercle en filet, comme Instagram, pour que les quatre aient la
  // même densité.
  Facebook: (
    <>
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.2 18.6v-5.5h1.85l.35-2.15h-2.2V9.52c0-.62.17-1.04 1.06-1.04h1.18V6.56a15 15 0 0 0-1.72-.09c-1.7 0-2.87 1.04-2.87 2.95v1.53H9v2.15h1.84v5.5z" />
    </>
  ),
}

export default function SocialLinks() {
  const items = SOCIAL_LINKS.filter(s => GLYPHES[s.name])
  if (items.length === 0) return null

  return (
    <ul className={styles.list}>
      {items.map(({ name, url }) => {
        const glyphe = (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {GLYPHES[name]}
          </svg>
        )
        return (
          <li key={name}>
            {url ? (
              <a
                href={url}
                className={styles.link}
                target="_blank"
                // noopener : sans lui, la page ouverte garde une référence
                // vers celle-ci via window.opener et peut la rediriger.
                rel="noopener noreferrer"
                aria-label={`${name} (nouvelle fenêtre)`}
              >
                {glyphe}
              </a>
            ) : (
              // Pas encore de compte : aucune ancre, donc rien à cliquer et
              // rien à tabuler. aria-hidden parce qu'une icône sans
              // destination n'apprend rien à un lecteur d'écran.
              <span className={styles.placeholder} aria-hidden="true">{glyphe}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
