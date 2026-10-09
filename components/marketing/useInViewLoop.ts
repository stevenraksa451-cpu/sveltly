'use client'
import { useEffect, useRef } from 'react'

// Met une animation en boucle en pause tant que son conteneur n'est pas à
// l'écran. Sans ça, les sept visuels animés des pages produit tournent tous
// en permanence, y compris ceux qui sont à quatre écrans plus bas : du travail
// de compositeur et de la batterie dépensés pour rien.
//
// Retourne une ref à poser sur le conteneur ; c'est lui qui porte
// animation-play-state, hérité par tous les enfants animés.
export function useInViewLoop<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // L'état initial est "en pause" (posé en CSS) : une animation ne démarre
    // donc jamais avant d'être vue, même si l'observateur tarde à répondre.
    const observer = new IntersectionObserver(
      ([entry]) => {
        el.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
        el.dataset.playing = entry.isIntersecting ? 'true' : 'false'
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
