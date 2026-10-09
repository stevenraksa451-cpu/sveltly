'use client'
// Monte l'observation des Core Web Vitals une fois par page. Composant vide :
// il ne rend rien, il observe. Inerte en production sauf NEXT_PUBLIC_PERF=1
// (voir lib/perf.ts) — aucun octet de mesure n'est envoyé nulle part.
import { useEffect } from 'react'
import { initWebVitals } from '@/lib/perf'

export default function PerfProbe() {
  useEffect(() => { initWebVitals() }, [])
  return null
}
