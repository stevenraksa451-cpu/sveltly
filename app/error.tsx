'use client'
// app/error.tsx
// Frontière d'erreur du site entier.
//
// Sans ce fichier, une exception non rattrapée pendant le rendu d'une page
// affiche l'écran de secours de Next : en production, un fond blanc portant
// « Application error: a client-side exception has occurred », en anglais,
// sans aucun moyen de repartir. L'utilisateur n'a alors que le bouton
// « précédent » de son navigateur, qui le renvoie souvent sur la page qui
// vient d'échouer.
//
// Une frontière d'erreur DOIT être un composant client : React doit pouvoir
// l'instancier côté navigateur au moment où le rendu casse.
//
// ⚠️ Ce fichier ne couvre pas une erreur du layout racine lui-même — ça,
// c'est global-error.tsx, qui doit alors rendre ses propres <html>/<body>.
// Le layout racine d'ici ne fait que poser des polices et des métadonnées :
// il n'exécute aucune logique susceptible de lever.
import { useEffect } from 'react'
import Link from 'next/link'
// Les tokens --mk-* ne sont posés que par cette feuille ; sans elle, les
// valeurs de repli de not-found.module.css s'appliquent (palette de l'app).
import '@/styles/marketing.css'
import styles from './not-found.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // La console du navigateur est le seul endroit où le détail reste
    // consultable : `digest` est l'identifiant que Next inscrit aussi dans
    // les journaux serveur, et c'est lui qui permet de relier les deux.
    console.error('❌ Erreur de rendu :', error.message, error.digest ?? '')
  }, [error])

  return (
    <div className="mkc">
      <main className={`mk ${styles.wrap}`}>
        <p className={styles.code}>ERREUR</p>
        <h1 className={styles.titre}>Quelque chose s’est mal passé</h1>
        <p className={styles.lede}>
          L’affichage de cette page a échoué. Ce n’est pas une action de votre part : réessayer
          suffit la plupart du temps, car l’erreur vient souvent d’une réponse réseau
          interrompue.
        </p>

        {/* Message générique, jamais error.message : il peut porter un
            chemin serveur, un fragment de requête ou un bout de jeton —
            la même règle que les routes API (voir lib/api-handler.ts). */}
        <div className={styles.sorties}>
          <button type="button" onClick={reset} className={styles.sortie}>
            <span className={styles.sortieLabel}>Réessayer</span>
            <span className={styles.sortieDesc}>Recharge cette page sans quitter votre session.</span>
          </button>
          <Link href="/dashboard" className={styles.sortie}>
            <span className={styles.sortieLabel}>Revenir au tableau de bord</span>
            <span className={styles.sortieDesc}>Vos emails et vos tâches y sont intacts.</span>
          </Link>
          <Link href="/contact" className={styles.sortie}>
            <span className={styles.sortieLabel}>Nous signaler le problème</span>
            <span className={styles.sortieDesc}>Si ça se reproduit, nous voulons le savoir.</span>
          </Link>
        </div>

        {error.digest && (
          <p className={styles.apres}>
            Référence à nous transmettre : <code>{error.digest}</code>
          </p>
        )}
      </main>
    </div>
  )
}
