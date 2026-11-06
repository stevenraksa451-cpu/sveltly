// app/not-found.tsx
// Page 404 du site entier.
//
// Sans ce fichier, Next sert son écran par défaut : « 404: This page could
// not be found. » — en anglais, sans barre de navigation, sans pied de page,
// sans la moindre issue, sur un site intégralement en français. Un visiteur
// qui suit un lien périmé arrivait donc sur un écran qui ne ressemblait pas
// au produit et ne lui proposait rien.
//
// Ce fichier vit à la RACINE de app/, pas dans (marketing) : un groupe de
// routes ne peut pas capturer les URL inconnues du site. Le chrome de la
// vitrine (classe `mkc`, barre, pied de page) est donc remonté ici à la main
// — c'est la seule duplication du layout marketing, et elle est voulue.
import Link from 'next/link'
import type { Metadata } from 'next'
import '@/styles/marketing.css'
import Navbar from '@/components/landing/nav/Navbar'
import SiteFooter from '@/components/marketing/SiteFooter'
import Brand from '@/components/ui/Brand'
import { CTA_PRIMARY_HREF } from '@/lib/brand'
import styles from './not-found.module.css'

// `robots: noindex` plutôt que l'absence de métadonnées : une 404 renvoie
// déjà le bon code HTTP, mais un moteur qui l'a mise en file d'attente avant
// la suppression de la page ne doit pas la garder en index.
export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
}

// Quelques portes de sortie utiles — pas un plan du site. Les libellés et
// les chemins restent courts : quelqu'un qui s'est perdu ne lit pas une
// liste de vingt entrées.
const SORTIES = [
  { href: '/', label: 'Accueil', desc: 'Ce que fait Sveltly, en une page.' },
  { href: '/produit', label: 'Le produit', desc: 'Le tri, les réponses, l’agenda, les tâches.' },
  { href: '/tarifs', label: 'Tarifs', desc: 'Le gratuit, le Pro, et leurs limites écrites.' },
  { href: '/faq', label: 'Questions fréquentes', desc: 'Y compris celles dont la réponse est « pas encore ».' },
]

export default function NotFound() {
  return (
    <div className="mkc">
      <Navbar />
      <main className={`mk ${styles.wrap}`}>
        <p className={styles.code}>404</p>
        <h1 className={styles.titre}>Cette page n’existe pas</h1>
        <p className={styles.lede}>
          Le lien est peut-être périmé, ou l’adresse comporte une faute. Rien n’est cassé de
          votre côté — <Brand /> n’a simplement rien à cette adresse.
        </p>

        <nav className={styles.sorties} aria-label="Où aller à partir d’ici">
          {SORTIES.map(s => (
            <Link key={s.href} href={s.href} className={styles.sortie}>
              <span className={styles.sortieLabel}>{s.label}</span>
              <span className={styles.sortieDesc}>{s.desc}</span>
            </Link>
          ))}
        </nav>

        <p className={styles.apres}>
          Vous cherchiez à vous connecter ?{' '}
          <Link href="/auth/login" className={styles.lien}>Ouvrir votre session</Link>
          {' '}· Pas encore de compte ?{' '}
          <Link href={CTA_PRIMARY_HREF} className={styles.lien}>Créer un compte</Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
