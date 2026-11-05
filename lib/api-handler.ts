// lib/api-handler.ts
// Filet de sécurité unique pour toutes les routes de app/api.
//
// LE DÉFAUT, REPRODUIT SANS MODIFIER UNE LIGNE DE CODE
// Plusieurs routes faisaient `await req.json()` sans protection. Un corps
// malformé suffisait :
//
//     curl -X POST /api/save-token -H 'Content-Type: application/json' \
//          -d 'pas-du-json'
//
//     statut : 500
//     type   : (aucun Content-Type)
//     corps  : VIDE
//
// Côté client, tout `await res.json()` lève alors
// `SyntaxError: Unexpected end of JSON input` — une rejection non gérée, un
// bouton qui reste en « Envoi… », et aucun message pour l'utilisateur. Le
// vrai problème n'est jamais affiché : il est remplacé par une erreur de
// parsing qui ne parle de rien.
//
// Ce n'était pas le seul chemin. N'importe quel `throw` inattendu — un champ
// absent déréférencé, une réponse d'API externe d'une forme imprévue — produit
// exactement la même page vide.
//
// POURQUOI UN EMBALLAGE ET PAS 18 try/catch
// Dix-huit copies du même bloc divergent : l'une loggue, l'autre non, une
// troisième renvoie 400 là où ses voisines renvoient 500, et la dix-neuvième
// route qu'on ajoutera n'en aura pas du tout. Ici la règle est écrite une
// fois, et une route non emballée se repère d'un coup d'œil.
//
// ⚠️ LE MESSAGE RENVOYÉ AU CLIENT EST VOLONTAIREMENT GÉNÉRIQUE.
// `err.message` peut contenir un fragment de requête SQL, un chemin de
// fichier du serveur ou un bout de jeton. Le détail va dans les journaux
// serveur, jamais dans la réponse.
// ⚠️ `import type`, et `Response.json()` plutôt que `NextResponse.json()`.
//
// Ce fichier doit rester importable par le lanceur de tests de Node, qui ne
// sait pas résoudre `next/server` (ERR_MODULE_NOT_FOUND). Un import de TYPE
// est effacé à la compilation : il ne coûte rien à l'exécution. Et
// `NextResponse.json()` n'est qu'une enveloppe autour du `Response.json()`
// standard, qu'une route Next accepte de rendre telle quelle — on se passe
// donc de l'enveloppe plutôt que de renoncer aux tests.
import type { NextRequest } from 'next/server'

export const ERREUR_GENERIQUE = 'Une erreur inattendue est survenue. Réessayez.'

/** Corps JSON malformé : c'est une erreur du client, pas du serveur. */
function estCorpsIllisible(err: unknown): boolean {
  return err instanceof SyntaxError
}

interface Options {
  /**
   * Quoi renvoyer en cas d'échec, quand du JSON n'a pas de sens.
   *
   * Les deux callbacks OAuth sont atteints par une NAVIGATION du navigateur :
   * leur rendre un objet JSON afficherait du texte brut à l'écran. Ils
   * redirigent vers les réglages avec un message, comme pour toutes leurs
   * autres erreurs.
   */
  surErreur?: (req: NextRequest) => Response
}

type Gestionnaire<A extends unknown[]> = (req: NextRequest, ...reste: A) => Promise<Response>

export function routeJson<A extends unknown[]>(
  gestionnaire: Gestionnaire<A>,
  options?: Options
): Gestionnaire<A> {
  return async (req: NextRequest, ...reste: A): Promise<Response> => {
    try {
      return await gestionnaire(req, ...reste)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${req.method} ${new URL(req.url).pathname} :`, detail)

      if (options?.surErreur) return options.surErreur(req)

      if (estCorpsIllisible(err)) {
        return Response.json({ error: 'Requête illisible.' }, { status: 400 })
      }
      return Response.json({ error: ERREUR_GENERIQUE }, { status: 500 })
    }
  }
}
