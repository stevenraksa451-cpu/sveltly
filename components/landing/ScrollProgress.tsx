'use client'
import { useEffect, useState } from 'react'
import styles from './ScrollProgress.module.css'

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // rAF-throttlé : un `scroll` event peut se déclencher plusieurs fois par
    // frame, et chaque appel direct à setProgress redéclenchait un re-render
    // React — regroupé ici à une seule mise à jour par frame au maximum (même
    // correctif que components/landing/ParallaxImage.tsx).
    let rafId: number | null = null

    function update() {
      rafId = null
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return <div className={styles.bar} style={{ width: `${progress}%` }} />
}