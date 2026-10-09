'use client'
import { useInViewLoop } from '../useInViewLoop'
import styles from './SecurityFlowVisual.module.css'

// Schéma du chemin des données : Gmail → Sveltly → vous. Volontairement
// austère — c'est la page où une illustration trop vive ferait suspecte.
//
// Les deux listes disent la même chose que la page, mais visuellement : ce
// qui entre, et ce qui ne sort jamais. Les croix ne sont pas décoratives,
// elles portent l'argument.
const READ = ['Objet et expéditeur', 'Corps du message', 'Dates mentionnées']
const NEVER = ['Revente à des tiers', 'Entraînement d’un modèle', 'Envoi sans votre clic']

export default function SecurityFlowVisual() {
  const ref = useInViewLoop<HTMLDivElement>()

  return (
    <div className={styles.wrap} ref={ref}>
      <div className={styles.flow} aria-hidden="true">
        <div className={styles.node}>
          <span className={styles.nodeLabel}>Gmail</span>
          <span className={styles.nodeSub}>votre boîte</span>
        </div>

        {/* Le trait animé indique un sens de circulation. Un seul point
            circule à la fois : deux rendraient la lecture confuse. */}
        <div className={styles.link}>
          <span className={styles.linkLine} />
          <span className={styles.packet} />
          <span className={styles.linkNote}>OAuth</span>
        </div>

        <div className={`${styles.node} ${styles.nodeCenter}`}>
          <span className={styles.nodeLabel}>Sveltly</span>
          <span className={styles.nodeSub}>tri, résumé, brouillon</span>
        </div>

        <div className={styles.link}>
          <span className={styles.linkLine} />
          <span className={styles.packet} style={{ animationDelay: '1.4s' }} />
          <span className={styles.linkNote}>HTTPS</span>
        </div>

        <div className={styles.node}>
          <span className={styles.nodeLabel}>Vous</span>
          <span className={styles.nodeSub}>vous décidez</span>
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Ce qui est lu</h3>
          <ul className={styles.list}>
            {READ.map(item => (
              <li key={item} className={styles.item}>
                <span className={`${styles.mark} ${styles.markYes}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Ce qui n’arrive jamais</h3>
          <ul className={styles.list}>
            {NEVER.map(item => (
              <li key={item} className={styles.item}>
                <span className={`${styles.mark} ${styles.markNo}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
