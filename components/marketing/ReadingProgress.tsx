'use client'
import { useEffect, useRef } from 'react'
import styles from './ReadingProgress.module.css'

// Barre de progression de lecture. Écriture directe dans le DOM via la ref,
// et scaleX plutôt que width : pas de rendu React par frame, et l'animation
// reste sur le compositeur. (Même raisonnement que
// components/landing/ScrollProgress.tsx, dont c'est la variante sobre.)
export default function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number | null = null

    function update() {
      rafId = null
      const el = ref.current
      if (!el) return
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0
      el.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return <div ref={ref} className={styles.bar} aria-hidden="true" />
}
