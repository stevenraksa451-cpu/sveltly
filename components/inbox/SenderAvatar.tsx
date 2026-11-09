'use client'
// components/inbox/SenderAvatar.tsx
// Pastille d'expéditeur : le logo du domaine quand il existe, les initiales
// sinon.
//
// Le favicon passe par /api/img, le même relais que les images d'emails.
// Deux raisons, dans cet ordre :
//
//   1. Le service de favicons de Google verrait sinon, requête après
//      requête, la LISTE DES DOMAINES qui écrivent à cet utilisateur —
//      associée à son adresse IP. Pour un produit dont l'argument est la
//      confidentialité, faire fuiter le carnet d'adresses vers un tiers à
//      chaque ouverture de la boîte serait difficile à défendre.
//   2. La CSP n'autorise pas `www.google.com` en source d'images, et
//      l'ouvrir pour une pastille de 32 px serait une mauvaise affaire.
//
// Le relais ne rend pas la chose parfaite : notre serveur, lui, interroge
// toujours Google. Mais il n'y a plus de lien entre un domaine demandé et
// l'utilisateur qui l'a demandé.
import { useState } from 'react'
import { initialesExpediteur, couleurExpediteur, domaineExpediteur } from '@/lib/expediteur'
import styles from './SenderAvatar.module.css'

export default function SenderAvatar({ nom, adresse, taille = 34 }: {
  nom: string
  adresse?: string
  taille?: number
}) {
  // `echec` bascule dès que l'image ne charge pas — domaine sans favicon,
  // relais en erreur, hors ligne. Le repli n'est pas un cas rare : beaucoup
  // de domaines d'emailing n'ont aucune icône.
  const [echec, setEchec] = useState(false)

  const domaine = adresse ? domaineExpediteur(adresse) : null
  const initiales = initialesExpediteur(nom)
  const { fond, encre } = couleurExpediteur(nom)

  const style = {
    width: taille,
    height: taille,
    background: fond,
    color: encre,
    fontSize: Math.round(taille * 0.38),
  }

  if (domaine && !echec) {
    const source = `/api/img?u=${encodeURIComponent(
      `https://www.google.com/s2/favicons?domain=${domaine}&sz=64`
    )}`
    return (
      <span className={styles.avatar} style={style} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element --
            next/image ne sait pas optimiser une image qui transite par notre
            propre relais, et une pastille de 34 px n'a rien à y gagner. Le
            repli sur les initiales est géré par onError, que next/image
            n'expose pas de la même façon. */}
        <img
          src={source}
          alt=""
          width={taille}
          height={taille}
          className={styles.favicon}
          loading="lazy"
          decoding="async"
          onError={() => setEchec(true)}
        />
      </span>
    )
  }

  return (
    <span className={styles.avatar} style={style} aria-hidden="true">
      {initiales}
    </span>
  )
}
