'use client'
// components/layout/AppLayout.tsx
import Header from './Header'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  // Certaines pages (dashboard) affichent déjà leur propre titre visuel
  // (ex: "Bonjour, Steven") — hideTitle garde le <h1> du Header dans le DOM
  // pour l'onglet du navigateur et les lecteurs d'écran, sans le dupliquer
  // visuellement à l'écran. Le VRAI titre d'onglet se règle par ailleurs,
  // via un export `metadata` dans un layout.tsx de segment (ex: voir
  // app/(app)/dashboard/layout.tsx) — pas ici : document.title en impératif
  // se fait écraser par la gestion interne du <title> du App Router.
  hideTitle?: boolean
}

export default function AppLayout({ children, title, subtitle, hideTitle }: AppLayoutProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} hideTitle={hideTitle} />
      <main className={styles.content}>
        {children}
      </main>
    </>
  )
}
