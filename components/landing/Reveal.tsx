'use client'
// components/landing/Reveal.tsx
import { useEffect, useRef, useState, ReactNode } from 'react'
import styles from './Reveal.module.css'

type Variant = 'up' | 'scale' | 'blur' | 'left' | 'right'

export default function Reveal({
  children,
  delay = 0,
  variant = 'up',
  className,
}: {
  children: ReactNode
  delay?: number
  variant?: Variant
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
    const el = ref.current
    if (!el) return
    // Une fois révélé, reste révélé — sans unobserve ici, visible repassait à
    // false dès que l'élément ressortait du viewport (en remontant la page),
    // rejouant l'animation d'entrée à chaque passage au lieu d'une révélation
    // ponctuelle, le comportement attendu pour ce genre d'effet.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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