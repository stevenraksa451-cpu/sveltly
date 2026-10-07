'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './ParallaxImage.module.css'

export default function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Un `scroll` event peut se déclencher plusieurs fois par frame — calculer
    // la position (getBoundingClientRect déclenche un reflow) et réécrire le
    // style à chaque occurrence sature inutilement le thread principal et
    // donne un parallax saccadé. `rafId` regroupe tout ça à une seule mise à
    // jour par frame, peu importe le nombre d'events reçus entre deux frames.
    let rafId: number | null = null

    function update() {
      rafId = null
      const wrap = wrapRef.current
      const img = imgRef.current
      if (!wrap || !img) return
      const rect = wrap.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      const offset = center * -0.08
      img.style.transform = `scale(1.15) translateY(${offset}px)`
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <Image ref={imgRef} src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.img} />
      <div className={styles.glow} />
      <div className={styles.grain} />
    </div>
  )
}