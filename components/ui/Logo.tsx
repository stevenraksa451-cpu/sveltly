'use client'
// components/ui/Logo.tsx
import styles from './Logo.module.css'

interface LogoProps {
  size?: number
  animated?: boolean
  showText?: boolean
  textColor?: string
}

export default function Logo({ size = 32, animated = false, showText = true, textColor }: LogoProps) {
  // Le logo n'est pas carré (ratio ~3:2) — on fixe la hauteur à `size`
  // et on laisse la largeur s'ajuster automatiquement pour garder les proportions.
  return (
    <div className={styles.logo}>
      <img
        src="/logo.png"
        alt="Sveltly"
        height={size}
        style={{ height: size, width: 'auto', display: 'block' }}
        className={animated ? styles.animated : ''}
      />
      {showText && (
        <span
          className={styles.text}
          // Par défaut, le nom s'écrit en dégradé de marque (voir .text) —
          // textColor reste une échappatoire pour un contexte précis qui
          // l'exigerait (aucun cas actuel dans le code), et doit alors
          // annuler explicitement le dégradé (background + text-fill-color),
          // pas juste `color` qui serait sans effet sur du texte en dégradé.
          style={textColor ? { background: 'none', WebkitTextFillColor: textColor, color: textColor } : undefined}
        >
          Sveltly
        </span>
      )}
    </div>
  )
}