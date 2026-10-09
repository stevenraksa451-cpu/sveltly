'use client'
// components/landing/Reveal.tsx
import { useEffect, useRef, useState, ReactNode } from 'react'
import styles from './Reveal.module.css'

type Variant = 'up' | 'scale' | 'blur' | 'left' | 'right'

export default function Reveal({
  children,
  delay = 0,
  variant = 'up',
  immediate = false,
  className,
}: {
  children: ReactNode
  delay?: number
  variant?: Variant
  /**
   * À poser sur TOUT contenu visible sans défiler (hero, premier visuel).
   *
   * Sans ça, le bloc part à `opacity: 0` dans le HTML envoyé par le serveur
   * et n'apparaît qu'après le téléchargement du JS, l'hydratation, puis le
   * déclenchement de l'IntersectionObserver. Mesuré par Lighthouse sur la
   * page d'accueil : LCP à 11,9 s, dont 11,4 s de « render delay » — le
   * score de performance tombait à 71, et le seul élément que Google voyait
   * peint tôt était le minuscule lien du bandeau d'annonce.
   *
   * Avec `immediate`, le bloc est opaque dès le premier rendu (y compris
   * côté serveur) et son entrée se joue en animation CSS pure, sur la seule
   * translation — une animation d'opacité repousserait le LCP exactement
   * comme avant.
   */
  immediate?: boolean
  // Fusionnée sur le même wrapper (plutôt qu'un div englobant
  // supplémentaire) : Reveal insère un vrai div dans le DOM, donc un enfant
  // placé dans une grid CSS (ex: grid-column: span 2) doit porter cette
  // classe ICI pour que le placement s'applique — sur l'enfant à
  // l'intérieur de Reveal, ça n'a aucun effet puisqu'il n'est pas l'enfant
  // direct du conteneur grid.
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (immediate) return
    const el = ref.current
    if (!el) return
    // Une fois révélé, reste révélé — sans unobserve ici, visible repassait à
    // false dès que l'élément ressortait du viewport (en remontant la page),
    // rejouant l'animation d'entrée à chaque passage au lieu d'une révélation
    // ponctuelle, le comportement attendu pour ce genre d'effet.
    // rootMargin positif en bas = la zone de détection déborde sous l'écran :
    // la section se révèle pendant qu'elle monte encore, et elle est donc
    // déjà en place quand elle entre réellement dans le champ. L'ancien
    // `threshold: 0.15` attendait au contraire que 15 % de la section soit
    // DÉJÀ visible pour commencer — en défilant un peu vite, on voyait le
    // bloc arriver vide puis se remplir après coup.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px 15% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [immediate])

  if (immediate) {
    return (
      <div
        ref={ref}
        className={`${styles.immediate} ${className || ''}`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${styles[variant]} ${visible ? styles.visible : ''} ${className || ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}