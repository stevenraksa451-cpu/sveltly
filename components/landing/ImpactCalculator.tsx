'use client'
import { useState, useEffect, useRef } from 'react'
import SparkleDoodle from './SparkleDoodle'
import Brand from '@/components/ui/Brand'
import { SAVINGS_RATIO } from '@/lib/time-saved'
import styles from './ImpactCalculator.module.css'

// Taux de change indicatifs, sourcés BCE / marché interbancaire, août 2026
const DEVISES = [
  { code: 'EUR', symbole: '€', position: 'after' as const, tauxDepuisEUR: 1 },
  { code: 'USD', symbole: '$', position: 'before' as const, tauxDepuisEUR: 1.15 },
  { code: 'GBP', symbole: '£', position: 'before' as const, tauxDepuisEUR: 0.856 },
  { code: 'CAD', symbole: 'CA$', position: 'before' as const, tauxDepuisEUR: 1.617 },
]

// Durée de travail, arrondie au quart d'heure : "6 h", "6 h 15", "6 h 30".
// Sans l'arrondi on obtenait "6 h 01", qui se lit comme une heure de la
// journée (6 h 01 du matin) et donne une fausse impression de précision sur
// une estimation.
function formatHours(hours: number): string {
  const quarters = Math.round((hours * 60) / 15)
  const h = Math.floor(quarters / 4)
  const m = (quarters % 4) * 15
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

function formatMoney(amountEUR: number, devise: typeof DEVISES[number]): string {
  const converted = Math.round(amountEUR * devise.tauxDepuisEUR)
  const num = converted.toLocaleString('fr-FR')
  return devise.position === 'before' ? `${devise.symbole}${num}` : `${num} ${devise.symbole}`
}

// Fait défiler la valeur affichée jusqu'à sa cible au lieu de la remplacer
// d'un coup : le montant est le cœur de ce bloc, et le voir grimper quand on
// pousse le curseur rend le lien de cause à effet immédiatement lisible.
//
// Animé via requestAnimationFrame plutôt qu'avec un setInterval : on reste
// calé sur les frames réelles du navigateur, et l'animation s'interrompt
// proprement dès que la cible change (curseur déplacé en continu) au lieu
// d'empiler des minuteurs concurrents qui se disputeraient la même valeur.
function useCountUp(target: number, durationMs = 450): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Deux cas où l'on affiche la valeur finale sans l'animer :
    // - "prefers-reduced-motion" : un compteur qui défile est précisément le
    //   genre d'animation que ce réglage demande d'éviter ;
    // - onglet masqué : le navigateur suspend complètement requestAnimationFrame
    //   en arrière-plan. Sans ce garde-fou, une valeur modifiée pendant que
    //   l'onglet n'est pas au premier plan reste bloquée sur l'ancien montant,
    //   et le reste même après le retour de l'utilisateur, puisque l'animation
    //   qui devait la mettre à jour n'a jamais démarré.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || document.hidden) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic : départ franc, arrivée amortie — la valeur se pose au
      // lieu de s'arrêter net.
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (target - from) * eased
      setValue(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      // Point de départ de la prochaine animation = là où celle-ci s'arrête,
      // sinon un curseur déplacé en continu repartirait à chaque fois de
      // l'ancienne valeur et l'affichage sauterait en arrière.
      fromRef.current = value
    }
    // `value` volontairement hors dépendances : il change à chaque frame, le
    // lister relancerait l'effet en boucle. Il n'est lu que dans le cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}

export default function ImpactCalculator() {
  const [devise, setDevise] = useState(DEVISES[0])
  const [tarifHoraireEUR, setTarifHoraireEUR] = useState(50)
  const [heuresParSemaine, setHeuresParSemaine] = useState(8)

  const tarifHoraireAffiche = Math.round(tarifHoraireEUR * devise.tauxDepuisEUR)

  function handleTarifChange(valeurAffichee: number) {
    setTarifHoraireEUR(Math.round(valeurAffichee / devise.tauxDepuisEUR))
  }

  // Temps rendu par Sveltly (tri, résumés, réponses, planification) = temps
  // qu'on peut à nouveau facturer, valorisé au tarif horaire du client.
  //
  // × SAVINGS_RATIO, et pas la totalité des heures saisies : Sveltly accélère
  // le traitement des emails, il ne les fait pas disparaître (il reste à
  // relire un résumé, valider un brouillon, confirmer un créneau — ces
  // secondes résiduelles sont chiffrées dans lib/time-saved.tsx). Compter
  // 100 % du temps email comme récupéré promettait un gain que le tableau de
  // bord du produit n'aurait jamais confirmé une fois le compte créé.
  const heuresRecupereesParSemaine = heuresParSemaine * SAVINGS_RATIO
  const gainMensuelEUR = tarifHoraireEUR * heuresRecupereesParSemaine * 4.33
  const gainAnnuelEUR = tarifHoraireEUR * heuresRecupereesParSemaine * 47

  // Seul le montant mensuel — le chiffre principal — est animé. Animer aussi
  // le total annuel et les heures ferait bouger trois nombres à la fois pour
  // un seul geste : on ne saurait plus lequel regarder.
  const gainMensuelAnime = useCountUp(gainMensuelEUR)

  return (
    // id : cible du lien "Simulateur de gain" du menu Ressources.
    <section id="simulateur" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>
          Ce que <Brand /> vous fait gagner
          <SparkleDoodle size={13} rotate={-10} className={styles.titleSparkle} />
        </h2>
        <p className={styles.desc}>
          Le temps passé sur les emails est du temps non facturé. <Brand /> l’automatise —
          voici ce que ça représente pour vous.
        </p>
      </div>

      <div className={styles.premiumCard}>
        <span className={styles.resultLabel}>Argent récupéré</span>

        <div className={styles.resultMain}>
          <span className={styles.resultValue}>{formatMoney(gainMensuelAnime, devise)}</span>
          <span className={styles.resultUnit}>par mois</span>
        </div>
        <div className={styles.resultSecondary}>
          {formatMoney(gainAnnuelEUR, devise)} par an
        </div>

        <p className={styles.resultBreakdown}>
          Soit <strong>{formatHours(heuresRecupereesParSemaine)}</strong> rendues chaque semaine
          sur les {heuresParSemaine} h que vous y passez.
        </p>

        <div className={styles.sliderBlock}>
          <div className={styles.sliderHead}>
            <span>Temps passé sur vos emails</span>
            <span className={styles.sliderValue}>{heuresParSemaine} h / semaine</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={heuresParSemaine}
            onChange={e => setHeuresParSemaine(Number(e.target.value))}
            className={styles.slider}
            aria-label="Heures passées sur les emails par semaine"
          />
        </div>

        <div className={styles.tarifBlock}>
          <span className={styles.tarifLabel}>Votre tarif horaire</span>
          <div className={styles.tarifInputRow}>
            <select
              value={devise.code}
              onChange={e => setDevise(DEVISES.find(d => d.code === e.target.value)!)}
              className={styles.currencySelect}
              aria-label="Devise"
            >
              {DEVISES.map(d => (
                <option key={d.code} value={d.code}>{d.code}</option>
              ))}
            </select>
            <input
              type="number"
              value={tarifHoraireAffiche}
              onChange={e => handleTarifChange(Number(e.target.value) || 0)}
              min={0}
              // Le libellé visible « Votre tarif horaire » n'était relié à rien :
              // le champ était annoncé sans nom par les lecteurs d'écran.
              aria-label="Votre tarif horaire"
              className={styles.tarifInput}
            />
          </div>
        </div>
      </div>

      <p className={styles.source}>
        Base de calcul : <Brand /> rend environ {Math.round(SAVINGS_RATIO * 100)} % du temps passé sur vos emails —
        pas la totalité, puisqu’il reste à relire un résumé et valider un brouillon. Même méthode que le
        compteur « temps économisé » de votre tableau de bord, détaillée dans le produit.
        Taux de change indicatifs, août 2026 — non actualisés en temps réel.
      </p>
    </section>
  )
}
