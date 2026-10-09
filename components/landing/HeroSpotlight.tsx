'use client'
import { useEffect, useRef } from 'react'
import styles from './HeroSpotlight.module.css'

export default function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Rien à faire sans souris : sur mobile/tablette l'événement ne se
    // déclenchera jamais, et pour qui a demandé moins d'animations, un halo
    // qui suit le curseur est exactement ce dont on se passe. On n'attache
    // alors aucun listener plutôt que d'en attacher un inutile.
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarsePointer || reducedMotion) return

    // mousemove se déclenche jusqu'à 120 fois par seconde. Chaque écriture de
    // --x/--y repeint un très grand dégradé radial : sans regroupement, on
    // repeignait plusieurs fois par frame pour un seul résultat visible, ce
    // qui suffit à faire tomber le défilement sous les 60 fps. Comme ailleurs
    // sur cette page (ParallaxImage, ScrollProgress), une seule mise à jour
    // par frame.
    let rafId: number | null = null
    let x = 0
    let y = 0

    function apply() {
      rafId = null
      const el = ref.current
      if (!el) return
      el.style.setProperty('--x', `${x}px`)
      el.style.setProperty('--y', `${y}px`)
    }

    function onMove(e: MouseEvent) {
      x = e.clientX
      y = e.clientY
      if (rafId === null) rafId = requestAnimationFrame(apply)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return <div ref={ref} className={styles.spotlight} aria-hidden="true" />
}
