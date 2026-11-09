'use client'
// hooks/useRaccourcis.ts
// Raccourcis clavier de la boîte de réception.
//
// ⚠️ LA RÈGLE QUI COMPTE : ne jamais voler une frappe à un champ de saisie.
// Le lecteur contient une zone de texte (le brouillon de réponse), quatre
// champs du formulaire d'agenda et une recherche. Sans garde, taper « réunion
// mardi » dans le brouillon archiverait l'email (E), en ouvrirait un autre
// (J/K) et créerait une tâche (T) — en silence, et sans retour en arrière
// possible pour l'archivage.
//
// Le garde couvre les quatre cas réels : <input>, <textarea>, <select>, et
// tout élément `contenteditable` (un éditeur riche ajouté plus tard le serait).
//
// Les modificateurs sont laissés passer sans rien déclencher : Ctrl+R doit
// recharger la page, Cmd+K ouvrir la recherche. Seul Ctrl/Cmd+K est capté,
// parce que c'est le raccourci que le produit expose déjà.

import { useEffect, useRef } from 'react'

export type Raccourcis = {
  suivant?: () => void       // J
  precedent?: () => void     // K
  archiver?: () => void      // E
  reponseIA?: () => void     // R
  tache?: () => void         // T
  basculerLu?: () => void    // U
  recherche?: () => void     // / ou Ctrl/Cmd+K
  fermer?: () => void        // Échap
}

/** Vrai si la frappe appartient à un champ de saisie : on ne la détourne pas. */
function dansUnChamp(cible: EventTarget | null): boolean {
  const el = cible as HTMLElement | null
  if (!el || !el.tagName) return false
  const t = el.tagName.toUpperCase()
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useRaccourcis(actions: Raccourcis, actif = true) {
  // L'appelant passe un objet littéral, donc une identité neuve à chaque
  // rendu. Sans cette référence, l'écouteur serait retiré et reposé sur
  // `window` à CHAQUE rendu du parent — c'est-à-dire à chaque frappe dans le
  // brouillon et à chaque poll de la liste. La référence garde l'écouteur
  // posé une fois, tout en lisant toujours les actions à jour.
  const ref = useRef(actions)
  ref.current = actions

  useEffect(() => {
    if (!actif) return

    function onKeyDown(e: KeyboardEvent) {
      // ⚠️ Lu DANS le gestionnaire, pas à l'abonnement : lire ref.current une
      // seule fois au montage figerait les actions de ce rendu-là, et
      // « archiver » agirait pour toujours sur le premier email ouvert.
      const a = ref.current

      // Ctrl/Cmd+K : capté MÊME depuis un champ — c'est le seul raccourci
      // qui doit fonctionner alors qu'on est en train d'écrire, parce qu'il
      // sert justement à quitter ce qu'on fait pour chercher.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (a.recherche) { e.preventDefault(); a.recherche() }
        return
      }

      // Échap ferme, y compris depuis un champ : c'est ce qu'on attend d'elle
      // partout, et le navigateur n'en fait rien d'autre ici.
      if (e.key === 'Escape') {
        if (a.fermer) a.fermer()
        return
      }

      if (dansUnChamp(e.target)) return
      // Une lettre combinée à un modificateur appartient au navigateur ou au
      // système (Ctrl+R, Cmd+T…). On ne s'en mêle pas.
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const table: Record<string, (() => void) | undefined> = {
        j: a.suivant,
        k: a.precedent,
        e: a.archiver,
        r: a.reponseIA,
        t: a.tache,
        u: a.basculerLu,
        '/': a.recherche,
      }
      const action = table[e.key.toLowerCase()]
      if (!action) return
      e.preventDefault()
      action()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // `actions` n'est volontairement PAS dans les dépendances : il passe par
    // la référence ci-dessus, et l'y mettre reposerait l'écouteur à chaque
    // rendu du parent — ce que cette référence existe précisément pour éviter.
  }, [actif])
}
