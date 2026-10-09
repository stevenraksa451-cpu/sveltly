'use client'
// components/ui/Logo.tsx
import Image from 'next/image'
import styles from './Logo.module.css'

interface LogoProps {
  size?: number
  animated?: boolean
  showText?: boolean
  textColor?: string
  /**
   * À activer pour le logo de la barre de navigation, visible sans défiler.
   * Sans ça, next/image le charge en différé, ce qui retarde le premier
   * élément identifiable de la page.
   */
  priority?: boolean
}

export default function Logo({ size = 32, animated = false, showText = true, textColor, priority = false }: LogoProps) {
  // Le logo n'est pas carré (ratio ~3:2) — on fixe la hauteur à `size`
  // et on laisse la largeur s'ajuster automatiquement pour garder les proportions.
  return (
    <div className={styles.logo}>
      {/* next/image, et non <img> : le fichier source fait 1536x1024 pour
          1 Mo, alors qu'il s'affiche à 32 px de haut. En balise brute, ce
          mégaoctet partait tel quel à chaque visiteur — Lighthouse mesurait
          2,58 Mo de poids total sur la page d'accueil. next/image le
          redimensionne et le sert en WebP/AVIF selon le navigateur. */}
      <Image
        src="/logo.png"
        // alt vide quand le nom est déjà écrit en toutes lettres à côté :
        // un lecteur d'écran annonçait « Sveltly Sveltly ». L'image devient
        // décorative, le texte porte le nom. Sans texte, l'image EST le nom.
        alt={showText ? '' : 'Sveltly'}
        width={Math.round(size * 1.5)}
        height={size}
        priority={priority}
        style={{ height: size, width: 'auto', display: 'block' }}
        className={animated ? styles.animated : ''}
      />
      {showText && (
        // Texte plein (pas de dégradé — voir la note dans Logo.module.css),
        // sauf le "e" : seule lettre en couleur de marque, le caractère
        // distinctif du logotype. textColor (si fourni) l'emporte sur les
        // deux pour les contextes à fond déjà coloré (ex: bouton indigo).
        <span className={styles.text} style={textColor ? { color: textColor } : undefined}>
          Sv<span className={styles.e} style={textColor ? { color: textColor } : undefined}>e</span>ltly
        </span>
      )}
    </div>
  )
}
