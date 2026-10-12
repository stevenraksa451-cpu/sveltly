import type { SVGProps } from 'react'

// Jeu d'icônes unique de l'espace connecté.
//
// SVG en ligne et non une bibliothèque : le projet n'ajoute pas de dépendance
// (voir CLAUDE.md). lucide-react coûterait ~40 kB gz pour une trentaine de
// glyphes qu'on dessine ici en quelques lignes.
//
// Grille 24, trait 1,5, bouts et jointures arrondis — c'est cette constance
// qui fait qu'un jeu d'icônes a l'air d'un jeu. Huit épaisseurs différentes
// cohabitaient (1,6 à 3) : côte à côte, certaines icônes paraissaient grasses
// et d'autres délavées, sans que rien ne le justifie.
//
// Taille par défaut 16 px (interface). La vitrine passe `size={20}`.

type Props = Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { size?: number }

function Svg({ size = 16, children, ...reste }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...reste}
    >
      {children}
    </svg>
  )
}

/* --- Navigation ---------------------------------------------------------- */
export const IconInbox = (p: Props) => (
  <Svg {...p}><path d="M4 13h3.5l1.5 3h6l1.5-3H20" /><path d="M5.5 5h13l1.5 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" /></Svg>
)
export const IconHome = (p: Props) => (
  <Svg {...p}><path d="M4 10.5 12 4l8 6.5" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></Svg>
)
export const IconCalendar = (p: Props) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8.5 3v4M15.5 3v4" /></Svg>
)
export const IconCheckSquare = (p: Props) => (
  <Svg {...p}><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /><path d="m8.5 11.5 3 3L21 5" /></Svg>
)
export const IconSettings = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.4-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.4 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" /></Svg>
)
export const IconHelp = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .9-1 1.6v.3" /><path d="M12 16.8h.01" /></Svg>
)

/* --- Actions ------------------------------------------------------------- */
export const IconSearch = (p: Props) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Svg>
)
export const IconPlus = (p: Props) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconClose = (p: Props) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
export const IconCheck = (p: Props) => <Svg {...p}><path d="m4.5 12.5 5 5L20 7" /></Svg>
export const IconReply = (p: Props) => (
  <Svg {...p}><path d="M9 17 4 12l5-5" /><path d="M4 12h11a4 4 0 0 1 4 4v1" /></Svg>
)
export const IconArchive = (p: Props) => (
  <Svg {...p}><rect x="3.5" y="4" width="17" height="4" rx="1" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" /></Svg>
)
export const IconTrash = (p: Props) => (
  <Svg {...p}><path d="M4 7h16M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" /></Svg>
)
export const IconRefresh = (p: Props) => (
  <Svg {...p}><path d="M20 11a8 8 0 0 0-13.7-5.3L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 13.7 5.3L20 16" /><path d="M20 20v-4h-4" /></Svg>
)
export const IconExternal = (p: Props) => (
  <Svg {...p}><path d="M14 4h6v6" /><path d="m20 4-8.5 8.5" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Svg>
)

/* --- Directions ---------------------------------------------------------- */
export const IconChevronDown = (p: Props) => <Svg {...p}><path d="m6 9.5 6 6 6-6" /></Svg>
export const IconChevronRight = (p: Props) => <Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>
export const IconChevronLeft = (p: Props) => <Svg {...p}><path d="m14.5 6-6 6 6 6" /></Svg>
export const IconArrowRight = (p: Props) => <Svg {...p}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></Svg>

/* --- Objets du produit --------------------------------------------------- */
export const IconMail = (p: Props) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></Svg>
)
export const IconClock = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
)
export const IconSparkle = (p: Props) => (
  <Svg {...p}><path d="M12 4.5 13.4 9 18 10.4 13.4 11.8 12 16.3 10.6 11.8 6 10.4 10.6 9z" /><path d="M18.5 15.5l.6 1.8 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z" /></Svg>
)
export const IconFile = (p: Props) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Svg>
)
export const IconUser = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>
)
export const IconLock = (p: Props) => (
  <Svg {...p}><rect x="4.5" y="10" width="15" height="10" rx="2" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></Svg>
)
export const IconShield = (p: Props) => (
  <Svg {...p}><path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6z" /></Svg>
)
export const IconLink = (p: Props) => (
  <Svg {...p}><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" /></Svg>
)
export const IconBell = (p: Props) => (
  <Svg {...p}><path d="M17.5 10a5.5 5.5 0 1 0-11 0c0 5-2 6.5-2 6.5h15s-2-1.5-2-6.5" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></Svg>
)
export const IconLogout = (p: Props) => (
  <Svg {...p}><path d="M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" /><path d="M15.5 16 20 12l-4.5-4" /><path d="M20 12H9.5" /></Svg>
)
export const IconMenu = (p: Props) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
export const IconPanelLeft = (p: Props) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></Svg>
)
