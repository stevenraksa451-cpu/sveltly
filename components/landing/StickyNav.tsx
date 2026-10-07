'use client'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import styles from './StickyNav.module.css'

export default function StickyNav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Logo size={34} showText />
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Fonctionnalités</a>
          <a href="#how" className={styles.navLink}>Comment ça marche</a>
          <a href="#faq" className={styles.navLink}>FAQ</a>
        </div>
        <div className={styles.navActions}>
          <Link href="/auth/login" className={styles.loginBtn}>Connexion</Link>
          <Link href="/auth/register" className={styles.ctaBtn}>Commencer</Link>
        </div>
      </div>
    </nav>
  )
}