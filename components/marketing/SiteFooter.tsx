import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { FOOTER_COLUMNS, NAV_DIRECT_LINK } from '@/lib/navigation'
import { BRAND_EMAIL, BRAND_TAGLINE } from '@/lib/brand'
import SocialLinks from '@/components/landing/nav/SocialLinks'
import styles from './SiteFooter.module.css'

// Pied de page commun à toutes les pages marketing. Les colonnes viennent de
// lib/navigation.ts — les mêmes liens que la barre du haut, sans duplication.
//
// Il se pose TOUJOURS en pleine largeur, hors du conteneur de la page : rendu
// à l'intérieur, son bandeau s'arrêtait à la gouttière et flottait au lieu de
// fermer la page. D'où son rendu dans app/(marketing)/layout.tsx, et non dans
// PageTail. La classe « mkc » lui donne les tokens --mk-* là où il vit hors
// de .mk (la landing).
export default function SiteFooter() {
  return (
    <footer className={`mkc ${styles.footer}`}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          {/* Pas d'aria-label : il disait « Accueil » alors que le lien affiche
              « Sveltly ». Un utilisateur de commande vocale qui prononce ce
              qu'il voit ne pouvait pas l'activer. Le nom accessible vient
              maintenant du texte lui-même. */}
          <Link href="/" className={styles.brandLink}>
            <Logo size={30} showText />
          </Link>
          <p className={styles.tagline}>{BRAND_TAGLINE}</p>
          <a href={`mailto:${BRAND_EMAIL}`} className={styles.mail}>{BRAND_EMAIL}</a>
        </div>

        <nav className={styles.cols} aria-label="Pied de page">
          {FOOTER_COLUMNS.map(col => (
            <div key={col.title} className={styles.col}>
              <h2 className={styles.colTitle}>{col.title}</h2>
              <ul className={styles.colList}>
                {col.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.colLink}>{link.label}</Link>
                  </li>
                ))}
                {col.title === 'Produit' && (
                  <li><Link href={NAV_DIRECT_LINK.href} className={styles.colLink}>{NAV_DIRECT_LINK.label}</Link></li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>© {new Date().getFullYear()} Sveltly. Tous droits réservés.</p>
        <SocialLinks />
      </div>
    </footer>
  )
}
