import '@/styles/marketing.css'
import Navbar from '@/components/landing/nav/Navbar'
import PerfProbe from '@/components/PerfProbe'
import SiteFooter from '@/components/marketing/SiteFooter'
import styles from './marketing.module.css'

// Groupe de routes : les parenthèses n'apparaissent pas dans l'URL. Toutes
// les pages marketing partagent cette barre de navigation et la feuille de
// style qui porte les tokens --mk-*.
//
// La palette est importée ici et non dans globals.css : elle ne s'applique
// que sous .mk (le corps d'une page) et .mkc (le chrome — barre et pied de
// page). L'espace connecté garde ses propres couleurs, et une refonte de la
// vitrine ne repeint pas l'application.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mkc ${styles.shell}`}>
      {/* Les blocs révélés au défilement partent à opacity 0 et sont dévoilés
          par IntersectionObserver. Sans JavaScript, ils resteraient donc
          invisibles : la page entière serait blanche. Ce filet les rend
          visibles d'emblée dans ce cas — le contenu prime sur l'animation. */}
      <noscript>
        <style>{`.mkReveal { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>
      <PerfProbe />
      <Navbar />
      {children}
      {/* Hors du conteneur des gabarits, pour que le bandeau aille d'un bord
          de l'écran à l'autre comme sur la landing. */}
      <SiteFooter />
    </div>
  )
}
