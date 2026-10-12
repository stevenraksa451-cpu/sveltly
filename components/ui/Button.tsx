import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './Button.module.css'

// Bouton — une seule définition pour tout le site.
//
// Trois variantes, et c'est tout : `primary` est le seul aplat indigo d'un
// écran, `secondary` porte les actions de second rang, `ghost` celles qu'on
// ne doit pas voir avant de les chercher. `danger` existe pour la suppression
// de compte, en rouge désaturé — un aplat rouge plein attirerait plus l'œil
// que l'action principale, ce qui inverse la hiérarchie de la page.
//
// Rendu en <a> dès qu'un `href` est passé : un bouton qui navigue doit être
// un lien, sinon il ne s'ouvre pas dans un nouvel onglet, ne se copie pas, et
// n'est pas annoncé comme une destination.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Commun = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Occupe toute la largeur disponible. */
  block?: boolean
  children: ReactNode
  className?: string
}

type BoutonProps = Commun & Omit<ComponentPropsWithoutRef<'button'>, keyof Commun> & { href?: undefined }
type LienProps = Commun & Omit<ComponentPropsWithoutRef<'a'>, keyof Commun> & { href: string }

export default function Button(props: BoutonProps | LienProps) {
  const { variant = 'secondary', size = 'md', block, className = '', children, ...reste } = props
  const classes = [styles.btn, styles[variant], styles[size], block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ')

  if ('href' in reste && typeof reste.href === 'string') {
    const { href, ...liens } = reste as Omit<LienProps, keyof Commun>
    // Lien externe : Next.js ne doit pas tenter de préparer la route.
    const externe = /^(https?:)?\/\//.test(href) || href.startsWith('mailto:')
    if (externe) {
      return <a href={href} className={classes} {...liens}>{children}</a>
    }
    return <Link href={href} className={classes} {...liens}>{children}</Link>
  }

  const { type = 'button', ...boutons } = reste as Omit<BoutonProps, keyof Commun>
  return <button type={type} className={classes} {...boutons}>{children}</button>
}
