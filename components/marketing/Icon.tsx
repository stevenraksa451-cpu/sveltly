import {
  IconSort, IconSummary, IconCheckSquare, IconCalendar, IconReply, IconGauge,
  IconCode, IconPalette, IconBriefcase, IconPen,
  // IconKey (la clé dessinée) est renommé : sans ça il entrerait en collision
  // avec le type IconKey de lib/navigation.ts importé juste en dessous.
  IconHelp, IconMail, IconKey as IconKeyGlyph, IconDatabase, IconShield, IconLock, IconTrash, IconScale,
} from '@/components/landing/icons'
import SparkleDoodle from '@/components/landing/SparkleDoodle'
import type { IconKey } from '@/lib/navigation'

// Fait le pont entre les clés textuelles de lib/navigation.ts (qui reste un
// fichier de données, sans JSX) et les composants d'icônes. Un seul endroit à
// compléter quand une nouvelle clé apparaît.
const MAP: Record<IconKey, () => React.ReactElement> = {
  sort: IconSort,
  summary: IconSummary,
  checkSquare: IconCheckSquare,
  calendar: IconCalendar,
  reply: IconReply,
  gauge: IconGauge,
  code: IconCode,
  palette: IconPalette,
  briefcase: IconBriefcase,
  pen: IconPen,
  help: IconHelp,
  mail: IconMail,
  key: IconKeyGlyph,
  database: IconDatabase,
  shield: IconShield,
  lock: IconLock,
  trash: IconTrash,
  scale: IconScale,
  sparkles: () => <SparkleDoodle size={20} />,
}

export default function Icon({ name }: { name: IconKey }) {
  const Cmp = MAP[name]
  return Cmp ? <Cmp /> : null
}
