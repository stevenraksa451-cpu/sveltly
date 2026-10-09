// lib/perf.ts
// Chronométrage de CHAQUE action réelle du produit, plus les métriques que
// Google utilise pour juger une page (Core Web Vitals).
//
// POURQUOI
// « Optimiser le site » sans mesure, c'est deviner. Ce module donne le même
// repère pour tout : une action porte un nom, elle a une durée, et cette
// durée se lit au même endroit. On optimise ensuite ce qui est réellement
// lent, pas ce qu'on imagine lent.
//
// COÛT
// Nul en production par défaut : tout est court-circuité sauf si
// NEXT_PUBLIC_PERF=1. En développement, c'est actif — c'est là qu'on mesure.
// Aucune donnée n'est envoyée nulle part : tout reste dans la console du
// navigateur et dans les logs serveur.

const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_PERF === '1'

// Préfixe unique, pour filtrer la console sans bruit (les logs applicatifs
// existants sont nombreux).
const TAG = '[perf]'

export interface ActionSample {
  name: string
  ms: number
  at: number
  detail?: Record<string, unknown>
}

// Historique en mémoire de la session — permet de relire toutes les mesures
// d'un coup (window.__perf()) au lieu de remonter la console ligne par ligne.
const samples: ActionSample[] = []
const MAX_SAMPLES = 500

function record(sample: ActionSample) {
  samples.push(sample)
  if (samples.length > MAX_SAMPLES) samples.shift()

  const detail = sample.detail ? ` ${JSON.stringify(sample.detail)}` : ''
  // eslint-disable-next-line no-console
  console.log(`${TAG} ${sample.name} ${sample.ms}ms${detail}`)
}

/**
 * Chronomètre une action. Retourne la fonction à appeler quand elle se
 * termine — y compris en cas d'échec, pour que les erreurs lentes
 * apparaissent aussi (une erreur qui met 8 s est un problème de performance
 * autant qu'un succès qui met 8 s).
 */
export function startAction(name: string): (detail?: Record<string, unknown>) => number {
  if (!ENABLED) return () => 0
  const t0 = performance.now()
  return (detail?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - t0)
    record({ name, ms, at: Date.now(), detail })
    return ms
  }
}

/** Même chose autour d'une promesse, pour ne pas oublier le `end()`. */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>
): Promise<T> {
  if (!ENABLED) return fn()
  const end = startAction(name)
  try {
    const result = await fn()
    end({ ...detail, ok: true })
    return result
  } catch (err) {
    end({ ...detail, ok: false })
    throw err
  }
}

/** Toutes les mesures de la session, les plus lentes d'abord. */
export function getSamples(): ActionSample[] {
  return [...samples].sort((a, b) => b.ms - a.ms)
}

/**
 * Synthèse par action : combien de fois, médiane, pire cas. La MÉDIANE plutôt
 * que la moyenne — une seule synchro à froid de 12 s suffit à rendre une
 * moyenne mensongère sur dix appels par ailleurs instantanés.
 */
export function summary(): Array<{ name: string; n: number; median: number; worst: number }> {
  const byName = new Map<string, number[]>()
  for (const s of samples) {
    const list = byName.get(s.name) ?? []
    list.push(s.ms)
    byName.set(s.name, list)
  }
  return Array.from(byName.entries())
    .map(([name, values]) => {
      const sorted = [...values].sort((a, b) => a - b)
      return {
        name,
        n: sorted.length,
        median: sorted[Math.floor(sorted.length / 2)],
        worst: sorted[sorted.length - 1],
      }
    })
    .sort((a, b) => b.median - a.median)
}

// --- Core Web Vitals ----------------------------------------------------
// Les trois métriques sur lesquelles Google juge effectivement une page, plus
// le TTFB qui explique souvent les deux premières. Mesurées avec les API
// natives du navigateur, sans dépendance : la bibliothèque web-vitals
// pèserait ~2 Ko gz sur toutes les pages pour un besoin de diagnostic.
//
// Seuils « bon » de Google, utilisés uniquement pour qualifier la mesure
// dans la console : LCP ≤ 2,5 s · CLS ≤ 0,1 · INP ≤ 200 ms.
const VITAL_BUDGET: Record<string, number> = { LCP: 2500, CLS: 0.1, INP: 200, TTFB: 800 }

function reportVital(name: string, value: number) {
  const budget = VITAL_BUDGET[name]
  const rounded = name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value)
  const verdict = budget === undefined ? '' : rounded <= budget ? ' ✓' : ` ✗ (budget ${budget})`
  // eslint-disable-next-line no-console
  console.log(`${TAG} vital ${name} ${rounded}${name === 'CLS' ? '' : 'ms'}${verdict}`)
}

let vitalsStarted = false

/**
 * À appeler une seule fois, côté client. Observe les métriques jusqu'à ce que
 * la page passe en arrière-plan — c'est le moment où les valeurs de LCP et
 * CLS sont définitives.
 */
export function initWebVitals() {
  if (!ENABLED || vitalsStarted || typeof window === 'undefined') return
  if (typeof PerformanceObserver === 'undefined') return
  vitalsStarted = true

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (nav) reportVital('TTFB', nav.responseStart)

  // `buffered: true` : récupère aussi les entrées émises AVANT cet appel —
  // sans quoi le LCP, souvent atteint très tôt, serait systématiquement raté.
  const observe = (type: string, cb: (entries: PerformanceEntryList) => void) => {
    try {
      new PerformanceObserver(list => cb(list.getEntries())).observe({ type, buffered: true })
    } catch {
      // Type non supporté par ce navigateur : on s'en passe, jamais d'erreur.
    }
  }

  let lcp = 0
  observe('largest-contentful-paint', entries => {
    lcp = entries[entries.length - 1]?.startTime ?? lcp
  })

  let cls = 0
  observe('layout-shift', entries => {
    for (const e of entries as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
      // Un décalage provoqué par une interaction de l'utilisateur ne compte
      // pas — c'est la règle de Google elle-même.
      if (!e.hadRecentInput) cls += e.value
    }
  })

  let inp = 0
  observe('event', entries => {
    for (const e of entries as unknown as Array<{ duration: number; interactionId?: number }>) {
      if (e.interactionId && e.duration > inp) inp = e.duration
    }
  })

  // Les valeurs ne sont définitives qu'au moment où la page est quittée ou
  // masquée.
  const flush = () => {
    if (lcp) reportVital('LCP', lcp)
    reportVital('CLS', cls)
    if (inp) reportVital('INP', inp)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Exposé pour pouvoir lire les mesures à la demande depuis la console ou
  // un outil d'automatisation, sans attendre de quitter la page.
  ;(window as unknown as Record<string, unknown>).__perf = () => ({
    vitals: { LCP: Math.round(lcp), CLS: Math.round(cls * 1000) / 1000, INP: Math.round(inp) },
    actions: summary(),
  })
}

// --- Côté serveur -------------------------------------------------------

/**
 * Chronomètre une étape serveur et renvoie de quoi composer un en-tête
 * `Server-Timing`, que les outils de développement des navigateurs affichent
 * nativement dans l'onglet réseau — sans avoir à lire les logs.
 */
export function serverTiming(entries: Record<string, number>): string {
  return Object.entries(entries)
    .map(([name, ms]) => `${name};dur=${Math.round(ms)}`)
    .join(', ')
}
