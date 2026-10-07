'use client'
import { useState } from 'react'
import SparkleDoodle from './SparkleDoodle'
import Brand from '@/components/ui/Brand'
import styles from './ImpactCalculator.module.css'

// Taux de change indicatifs, sourcés BCE / marché interbancaire, août 2026
const DEVISES = [
  { code: 'EUR', symbole: '€', position: 'after' as const, tauxDepuisEUR: 1 },
  { code: 'USD', symbole: '$', position: 'before' as const, tauxDepuisEUR: 1.15 },
  { code: 'GBP', symbole: '£', position: 'before' as const, tauxDepuisEUR: 0.856 },
  { code: 'CAD', symbole: 'CA$', position: 'before' as const, tauxDepuisEUR: 1.617 },
]

function formatMoney(amountEUR: number, devise: typeof DEVISES[number]): string {
  const converted = Math.round(amountEUR * devise.tauxDepuisEUR)
  const num = converted.toLocaleString('fr-FR')
  return devise.position === 'before' ? `${devise.symbole}${num}` : `${num} ${devise.symbole}`
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
  const gainMensuelEUR = tarifHoraireEUR * heuresParSemaine * 4.33
  const gainAnnuelEUR = tarifHoraireEUR * heuresParSemaine * 47

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.label}>
          Votre gain
          <SparkleDoodle size={13} rotate={-10} />
        </div>
        <h2 className={styles.title}>Ce que <Brand /> vous fait gagner</h2>
        <p className={styles.desc}>
          Le temps passé sur les emails est du temps non facturé. <Brand /> l'automatise —
          voici ce que ça représente pour vous.
        </p>
      </div>

      <div className={styles.premiumCard}>
        <span className={styles.resultLabel}>Argent récupéré</span>

        <div className={styles.resultMain}>
          <span className={styles.resultValue}>{formatMoney(gainMensuelEUR, devise)}</span>
          <span className={styles.resultUnit}>par mois</span>
        </div>
        <div className={styles.resultSecondary}>
          {formatMoney(gainAnnuelEUR, devise)} par an
        </div>

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
              className={styles.tarifInput}
            />
          </div>
        </div>
      </div>

      <p className={styles.source}>
        Base de calcul : temps moyen passé sur l'email selon le Work Trend Index de Microsoft.
        Taux de change indicatifs, août 2026 — non actualisés en temps réel.
      </p>
    </section>
  )
}
