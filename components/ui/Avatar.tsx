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
        // Exception assumée à la règle « les images passent par next/image »
        // (voir CLAUDE.md), désactivée ICI et nulle part ailleurs :
        // — l'image est distante (lh3.googleusercontent.com ou Supabase, déjà
        //   autorisés par le CSP de next.config.js) et servie à 34 ou 48 px.
        //   Google la rend déjà dimensionnée ; la faire transiter par
        //   l'optimiseur de Next ajouterait un aller-retour serveur par avatar
        //   sans rien gagner, et demanderait images.remotePatterns.
        // — elle est purement décorative (alt vide, aria-hidden) : les
        //   initiales en dessous portent l'information.
        // — onLoad/onError pilotent le repli sur les initiales quand l'URL
        //   casse, qui est la raison d'être de ce composant.
        // eslint-disable-next-line @next/next/no-img-element
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
