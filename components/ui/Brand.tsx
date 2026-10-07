// components/ui/Brand.tsx
// Toute occurrence du mot "Sveltly" dans un texte courant (hors logo, voir
// Logo.tsx qui applique le même traitement séparément) passe par ce
// composant — une seule police/couleur à tenir à jour pour que le nom de la
// marque se reconnaisse partout où il est écrit, au lieu de se fondre dans
// le texte environnant.
import styles from './Brand.module.css'

export default function Brand({
  className,
  color,
}: {
  className?: string
  // Échappatoire pour les contextes à fond déjà coloré dans les teintes de
  // la marque (ex: bouton indigo plein) — le dégradé par défaut s'y
  // fondrait au lieu de ressortir. Annule le dégradé proprement (pas juste
  // `color`, sans effet sur du texte en background-clip: text).
  color?: string
}) {
  return (
    <span
      className={`${styles.brand} ${className || ''}`}
      style={color ? { background: 'none', WebkitTextFillColor: color, color } : undefined}
    >
      Sveltly
    </span>
  )
}
