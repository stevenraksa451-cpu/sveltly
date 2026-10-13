import styles from './HeroAmbience.module.css'

// Les nappes colorées du fond du hero — quatre jeux superposés qui se
// relaient au même rythme que le mot tournant du titre (voir HeroWord).
//
// Quatre CALQUES qui se fondent plutôt qu'un seul fond dont on animerait les
// dégradés : l'opacité se compose sur la carte graphique, alors qu'un
// `background` animé force le navigateur à repeindre la zone à chaque image —
// ici une surface qui fait toute la largeur de l'écran.
//
// Le grain vit dans ce composant lui aussi, posé par-dessus les calques :
// sans lui, un dégradé sombre de cette taille montre des bandes de
// quantification sur les écrans 8 bits.

const TEINTES = ['indigo', 'menthe', 'ambre', 'azur'] as const

export default function HeroAmbience() {
  return (
    <div className={styles.ambiance} aria-hidden="true">
      {TEINTES.map(t => <div key={t} className={`${styles.calque} ${styles[t]}`} />)}
      <div className={styles.grain} />
    </div>
  )
}
