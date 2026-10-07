'use client'
import { memo } from 'react'
import Link from 'next/link'
import Brand from '@/components/ui/Brand'
import styles from './AIBanner.module.css'

// memo : contenu entièrement statique (aucune prop, aucun state) — évite de
// re-créer ce sous-arbre JSX à chaque rendu du dashboard parent.
function AIBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerIcon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>
      </div>
      <h3 className={styles.bannerTitle}><Brand color="white" /> IA</h3>
      <p className={styles.bannerText}>
        Trie vos emails, rédige vos réponses et détecte vos rendez-vous automatiquement.
      </p>
      <Link href="/inbox" className={styles.bannerBtn}>
        Ouvrir la boîte de réception
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </Link>
    </div>
  )
}

export default memo(AIBanner)