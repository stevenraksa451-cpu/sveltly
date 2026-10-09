'use client'
import { useEffect, useRef } from 'react'
import styles from './ScrollProgress.module.css'

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Écriture directe dans le DOM via la ref, sans useState : la barre se met
    // à jour à chaque frame de défilement, et passer par un state React
    // relançait à chaque fois un rendu complet du composant (réconciliation +
    // commit) pour ne changer qu'un seul nombre dans un style. Ici le même
    // travail coûte une affectation de propriété.
    //
    // scaleX plutôt que width : une largeur modifie la géométrie et force un
    // layout + paint à chaque frame, alors qu'une transformation reste sur le
    // compositeur. C'est la différence entre une barre qui glisse et une barre
    // qui fait tressauter le reste de la page sur une machine modeste.
    let rafId: number | null = null

    function update() {
      rafId = null
      const el = ref.current
      if (!el) return
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const ratio = docHeight > 0 ? window.scrollY / docHeight : 0
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
