import styles from './Spots.module.css'

// Illustrations d'accompagnement — « spots ». Petites, au trait, dans le
// langage graphique déjà posé par les doodles de la landing : épaisseur fine,
// extrémités arrondies, un seul détail en couleur.
//
// Règles tenues partout dans ce fichier :
// - `currentColor` pour le trait principal, donc le spot prend la couleur du
//   texte qui l'entoure et reste lisible en toute circonstance ;
// - exactement UN élément dans la teinte d'accent, jamais deux ;
// - aucune icône pleine, aucun aplat : ce sont des dessins, pas des pictos ;
// - `aria-hidden` systématique — ils accompagnent un texte qui dit déjà la
//   chose, les répéter pour un lecteur d'écran serait du bruit.

type SpotProps = { className?: string; size?: number }

function Svg({ className, size = 120, children, viewBox = '0 0 120 120' }: SpotProps & {
  children: React.ReactNode
  viewBox?: string
}) {
  return (
    <svg
      className={`${styles.spot} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Pile d'emails qui se range — trois niveaux, le premier mis en avant. */
export function SpotSorting(props: SpotProps) {
  return (
    <Svg {...props}>
      <rect x="18" y="26" width="84" height="20" rx="5" className={styles.accentStroke} />
      <path d="M26 36h22M56 36h14" className={styles.accentStroke} />
      <rect x="26" y="54" width="76" height="18" rx="5" opacity="0.55" />
      <path d="M34 63h20M62 63h12" opacity="0.55" />
      <rect x="34" y="80" width="68" height="16" rx="5" opacity="0.3" />
      <path d="M42 88h18M68 88h10" opacity="0.3" />
      {/* La petite flèche dit le mouvement : ça descend, ça se range. */}
      <path d="M12 58v26M12 84l-4-5M12 84l4-5" opacity="0.4" />
    </Svg>
  )
}

/** Une carte de résumé, une ligne pleine et deux tronquées. */
export function SpotSummary(props: SpotProps) {
  return (
    <Svg {...props}>
      <rect x="20" y="24" width="80" height="72" rx="8" />
      <path d="M32 44h56" className={styles.accentStroke} />
      <path d="M32 58h44" opacity="0.5" />
      <path d="M32 70h32" opacity="0.5" />
      {/* Point d'amorce : c'est la phrase qui compte. */}
      <circle cx="26" cy="44" r="2.4" fill="currentColor" stroke="none" className={styles.accentFill} />
    </Svg>
  )
}

/** Trois tâches, la première cochée. */
export function SpotTasks(props: SpotProps) {
  return (
    <Svg {...props}>
      <rect x="22" y="28" width="16" height="16" rx="4" className={styles.accentStroke} />
      <path d="M26 36.5l3.5 3.5 5-6" className={styles.accentStroke} />
      <path d="M48 36h44" />
      <rect x="22" y="54" width="16" height="16" rx="4" opacity="0.6" />
      <path d="M48 62h34" opacity="0.6" />
      <rect x="22" y="80" width="16" height="16" rx="4" opacity="0.35" />
      <path d="M48 88h24" opacity="0.35" />
    </Svg>
  )
}

/** Une journée, avec un créneau occupé. */
export function SpotAgenda(props: SpotProps) {
  return (
    <Svg {...props}>
      <rect x="20" y="26" width="80" height="72" rx="8" />
      <path d="M20 44h80M40 26v-8M80 26v-8" />
      <rect x="32" y="56" width="42" height="14" rx="4" className={styles.accentStroke} />
      <path d="M32 82h26" opacity="0.4" />
      <path d="M66 82h22" opacity="0.4" />
    </Svg>
  )
}

/** Un brouillon en cours d'écriture, avec la plume. */
export function SpotReply(props: SpotProps) {
  return (
    <Svg {...props}>
      <path d="M22 30h56a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H44l-14 12V76h-8a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8Z" />
      <path d="M34 46h30" opacity="0.5" />
      <path d="M34 58h18" opacity="0.5" />
      <path d="M96 34l6 6-24 24-8 2 2-8Z" className={styles.accentStroke} />
    </Svg>
  )
}

/** Un bouclier, et à l'intérieur une donnée qui reste à sa place. */
export function SpotSecurity(props: SpotProps) {
  return (
    <Svg {...props}>
      <path d="M60 20l32 12v26c0 20-14 34-32 42-18-8-32-22-32-42V32Z" />
      <path d="M48 58l8 9 18-20" className={styles.accentStroke} />
    </Svg>
  )
}

/** Le chemin d'une donnée : trois étapes reliées. */
export function SpotFlow(props: SpotProps) {
  return (
    <Svg {...props}>
      <circle cx="26" cy="60" r="12" />
      <circle cx="60" cy="60" r="14" className={styles.accentStroke} />
      <circle cx="94" cy="60" r="12" />
      <path d="M38 60h8M74 60h8" opacity="0.6" />
      <path d="M56 56l5 4-5 4" className={styles.accentStroke} />
    </Svg>
  )
}

/** Deux heures de concentration : un bloc plein, le reste vide. */
export function SpotFocus(props: SpotProps) {
  return (
    <Svg {...props}>
      <circle cx="60" cy="60" r="36" />
      {/* L'arc d'accent couvre un quart du cercle : la part protégée. */}
      <path d="M60 24a36 36 0 0 1 36 36" className={styles.accentStroke} strokeWidth="2.6" />
      <path d="M60 40v20l13 8" />
    </Svg>
  )
}

/** Un curseur et sa valeur — pour le calculateur. */
export function SpotGauge(props: SpotProps) {
  return (
    <Svg {...props}>
      <path d="M22 76a38 38 0 0 1 76 0" />
      <path d="M22 76h12M98 76h-12" opacity="0.5" />
      <path d="M60 76l20-22" className={styles.accentStroke} strokeWidth="2.4" />
      <circle cx="60" cy="76" r="4" fill="currentColor" stroke="none" className={styles.accentFill} />
    </Svg>
  )
}

/** Plusieurs boîtes réunies en une. */
export function SpotMailboxes(props: SpotProps) {
  return (
    <Svg {...props}>
      <rect x="16" y="30" width="44" height="30" rx="6" opacity="0.45" />
      <path d="M16 36l22 14 22-14" opacity="0.45" />
      <rect x="58" y="30" width="44" height="30" rx="6" opacity="0.45" />
      <path d="M58 36l22 14 22-14" opacity="0.45" />
      <rect x="36" y="64" width="48" height="32" rx="6" className={styles.accentStroke} />
      <path d="M36 70l24 15 24-15" className={styles.accentStroke} />
    </Svg>
  )
}
