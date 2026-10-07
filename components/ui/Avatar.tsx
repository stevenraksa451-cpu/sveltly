'use client'
// components/ui/Avatar.tsx
//
// Affichage d'avatar résilient : les initiales sont TOUJOURS rendues comme
// base, et la photo ne les recouvre qu'une fois son chargement confirmé par
// onLoad. Si la source échoue (onError) — fichier supprimé du bucket Storage,
// policy RLS manquante, ou blocage navigateur comme l'ORB de Chrome sur les
// URLs d'avatar Google (googleusercontent.com sans en-tête CORP adapté) —
// l'image ne devient jamais visible : on reste sur les initiales, jamais
// d'icône cassée ni de texte alt brut à l'écran.
import { useEffect, useState } from 'react'
import styles from './Avatar.module.css'

interface AvatarProps {
  src?: string | null
  initials: string
  size?: number
  className?: string
}

export default function Avatar({ src, initials, size = 40, className }: AvatarProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // Une nouvelle src (changement de compte, nouvel upload) doit repartir
  // d'un état propre — sinon une image chargée avec succès resterait
  // affichée par-dessus une nouvelle src cassée le temps du nouveau essai.
  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  const canShowImage = !!src && !failed

  return (
    <div
      className={`${styles.avatar} ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <span className={styles.initials} style={{ fontSize: size * 0.4 }}>
        {initials}
      </span>
      {canShowImage && (
        <img
          key={src}
          src={src!}
          alt=""
          aria-hidden="true"
          className={styles.img}
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
