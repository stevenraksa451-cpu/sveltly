import styles from './HeroWord.module.css'

// Le dernier mot du titre tourne : Avancez → Progressez → Évoluez → Décidez,
// six secondes chacun.
//
// Chaque mot a son propre dégradé, et les nappes colorées du fond du hero
// changent EN MÊME TEMPS pour s'accorder à lui (voir HeroAmbience, qui rejoue
// exactement les mêmes pourcentages de keyframes). Les quatre temps sont
// définis une seule fois, dans HeroWord.module.css — modifier la durée ou le
// nombre de mots demande de toucher les deux fichiers ensemble.
//
// Tout est en CSS. Pas de useState, pas d'intervalle, pas d'hydratation : le
// titre est le plus gros élément de la page, et c'est lui qui décide du LCP.
// Un composant client ici aurait fait attendre le premier rendu utile.
//
// Les quatre mots sont empilés dans une grille à une seule cellule : ils
// occupent tous la même place, donc la ligne ne se décale pas quand le mot
// change. Sans ça, « Progressez. » pousserait tout le titre à chaque tour et
// le CLS mesuré s'effondrerait.

const MOTS = [
  { mot: 'Avancez.', teinte: 'indigo' },
  { mot: 'Progressez.', teinte: 'menthe' },
  { mot: 'Évoluez.', teinte: 'ambre' },
  // « Continuez » disait « poursuivez comme avant » — l'inverse de ce que
  // promet le produit. « Décidez » reprend l'accroche juste en dessous :
  // « Vous arrivez le matin sur des décisions, pas sur une pile. »
  { mot: 'Décidez.', teinte: 'azur' },
] as const

export default function HeroWord() {
  return (
    <>
      {/* Le nom accessible du titre est fixe. Un lecteur d'écran qui
          énumérerait les quatre variantes, ou qui les verrait changer sous
          lui, n'y gagnerait rien : la rotation est décorative. */}
      <span className="sr-only">Avancez.</span>
      <span className={styles.rotor} aria-hidden="true">
        {MOTS.map(({ mot, teinte }) => (
          <span key={mot} className={`${styles.mot} ${styles[teinte]}`}>{mot}</span>
        ))}
      </span>
    </>
  )
}
