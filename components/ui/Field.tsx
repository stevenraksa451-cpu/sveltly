import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './Field.module.css'

// Champ de saisie et champ de recherche.
//
// `icon` se place à gauche, `suffix` à droite (typiquement une touche ⌘K).
// Les deux sont décoratifs : ils ne reçoivent pas le clic, qui va au champ.

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'size'> & {
  icon?: ReactNode
  suffix?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Field({ icon, suffix, size = 'md', className = '', ...reste }: Props) {
  const wrap = [styles.wrap, icon ? styles.hasIcon : '', suffix ? styles.hasSuffix : '', className]
    .filter(Boolean)
    .join(' ')
  const input = [styles.input, size !== 'md' ? styles[size] : ''].filter(Boolean).join(' ')

  return (
    <div className={wrap}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <input className={input} {...reste} />
      {suffix && <span className={styles.suffix} aria-hidden="true">{suffix}</span>}
    </div>
  )
}
