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
  // la marque (ex: bouton indigo plein) — le "e" de couleur s'y fondrait
  // sinon. Dans ce cas, tout le mot (y compris le "e") passe dans la
  // couleur fournie, uniforme.
  color?: string
}) {
  return (
    <span className={`${styles.brand} ${className || ''}`} style={color ? { color } : undefined}>
      Sv<span className={styles.e} style={color ? { color } : undefined}>e</span>ltly
    </span>
  )
}
