'use client'
import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

type From = 'up' | 'left' | 'right' | 'scale' | 'none'

// Révélation à l'entrée dans l'écran. Trois choix qui comptent :
//
// 1. Un attribut data-shown plutôt qu'un state React : la bascule se fait
//    dans le DOM, sans re-rendu. Sur une page qui contient trente éléments
//    révélés, ça évite trente rendus pendant le défilement.
// 2. rootMargin négatif en bas : l'élément se révèle quand il a franchi le
//    bas de l'écran d'une centaine de pixels, pas à l'instant où il pointe.
// 3. unobserve immédiat : la révélation ne se rejoue jamais. Un contenu qui
//    réapparaît en remontant la page est un effet de démonstration, pas de
//    lecture.
export default function Reveal({
  children,
  as: Tag = 'div',
  from = 'up',
  index = 0,
  immediate = false,
  className,
  ...rest
}: {
  children: ReactNode
  as?: ElementType
  from?: From
  /** Rang dans une cascade : pilote le retard (70 ms par cran). */
  index?: number
  /**
   * À poser sur le contenu visible sans défiler — titre et accroche de
   * chaque gabarit. Sans ça, le h1 part à opacity 0 dans le HTML du serveur
   * et n'apparaît qu'après hydratation : c'est exactement ce qui faisait
   * tomber le LCP de la page d'accueil à 11,9 s (mesuré par Lighthouse),
   * et les 21 pages vitrine avaient le même défaut. Opaque dès le premier
   * rendu, entrée jouée en animation CSS sur la seule translation.
   */
  immediate?: boolean
  className?: string
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (immediate) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.shown = 'true'
        observer.unobserve(el)
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [immediate])

  return (
    <Tag
      ref={ref}
      className={className ? `mkReveal ${className}` : 'mkReveal'}
      data-from={from}
      data-immediate={immediate ? 'true' : undefined}
      style={{ '--mk-i': index } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}
