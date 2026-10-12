import styles from './Kbd.module.css'

// Touche de clavier.
//
// Ne l'affichez QUE si le raccourci fonctionne réellement. Une touche
// décorative promet une vitesse que le produit n'a pas, et c'est la première
// chose qu'un utilisateur essaie.
//
// `keys` accepte une séquence : <Kbd keys={['G', 'I']} /> rend deux touches
// lues comme un seul geste.

export default function Kbd({
  children,
  keys,
  size = 'sm',
  onDark = false,
}: {
  children?: string
  keys?: string[]
  size?: 'sm' | 'lg'
  onDark?: boolean
}) {
  const classe = [styles.kbd, size === 'lg' ? styles.lg : '', onDark ? styles.onDark : '']
    .filter(Boolean)
    .join(' ')

  if (keys && keys.length > 0) {
    return (
      <span className={styles.sequence}>
        {keys.map((k, i) => <kbd key={`${k}-${i}`} className={classe}>{k}</kbd>)}
      </span>
    )
  }
  return <kbd className={classe}>{children}</kbd>
}
