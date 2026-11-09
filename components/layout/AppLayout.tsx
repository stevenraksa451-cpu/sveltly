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
  // Colle le contenu aux bords : retire la gouttière de 28 px ET la
  // contrainte de largeur --content-max. Réservé aux pages dont la mise en
  // page EST l'écran — la boîte de réception et ses trois panneaux pleine
  // hauteur. Une page de contenu doit garder la gouttière, sinon son texte
  // court d'un bord à l'autre d'un écran large et devient illisible.
  //
  // Prop plutôt que marge négative dans la page : un `margin: -28px` ne
  // défait pas le max-width, et se décale en silence le jour où la gouttière
  // change. Ici, les deux valeurs restent déclarées à UN seul endroit.
  flush?: boolean
}

export default function AppLayout({ children, title, subtitle, hideTitle, flush }: AppLayoutProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} hideTitle={hideTitle} />
      <main className={`${styles.content} ${flush ? styles.flush : ''}`}>
        {children}
      </main>
    </>
  )
}
