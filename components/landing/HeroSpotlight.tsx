'use client'
import { useEffect, useRef } from 'react'
import styles from './HeroSpotlight.module.css'

export default function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!ref.current) return
      ref.current.style.setProperty('--x', `${e.clientX}px`)
      ref.current.style.setProperty('--y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div ref={ref} className={styles.spotlight} aria-hidden="true" />
}