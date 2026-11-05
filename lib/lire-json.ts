// lib/lire-json.ts
// Lire la réponse d'une route API sans jamais lever.
//
// POURQUOI, ALORS QUE LES ROUTES RENDENT DÉJÀ TOUJOURS DU JSON
// `lib/api-handler.ts` garantit qu'une route de ce projet répond en JSON,
// même quand elle lève. Mais il ne couvre pas ce qui se passe AVANT ou APRÈS
// le code applicatif :
//
//   - un 502 / 503 / 504 de l'hébergeur, qui rend sa propre page HTML ;
//   - un timeout de plateforme, qui coupe la réponse en plein milieu ;
//   - un proxy d'entreprise ou un portail Wi-Fi qui intercepte la requête.
//
// Dans tous ces cas `await res.json()` lève un `SyntaxError`, la promesse
// n'est pas rattrapée, et l'interface reste figée : le bouton garde son
// « Envoi… », aucun message n'apparaît. L'utilisateur ne peut ni comprendre
// ni réessayer.
//
// LE CONTRAT
// Rendre TOUJOURS un objet. Corps illisible → `{ error: … }` avec le code
// HTTP, parce que tous les appelants suivent déjà le motif
// `json.error || 'message par défaut'` : un message vrai s'y insère sans
// qu'aucun d'eux ne change de forme.
//
// ⚠️ Lire `res.text()` et PAS `res.json()` : le corps d'une réponse ne se lit
// qu'une fois. Appeler `.json()` puis `.text()` dans un `catch` lèverait
// « body stream already read » — une deuxième erreur par-dessus la première,
// encore moins lisible que celle qu'on essayait d'attraper.

/**
 * ⚠️ Le défaut est `any`, et c'est délibéré — pas de la paresse.
 *
 * `res.json()` rend `any` : garder ce défaut fait de cette fonction un
 * remplacement STRICTEMENT additif, qui ne change que le comportement à
 * l'exécution. Avec `Record<string, unknown>`, les quatorze appels se
 * mettaient à produire dix erreurs de typage sur des champs jusque-là
 * implicitement `any` — et les corriger aurait demandé d'inventer la forme de
 * chaque réponse, dans le même commit que le correctif. Deux changements
 * mêlés, dont un deviné.
 *
 * Passer un type explicite est encouragé et fonctionne déjà :
 *
 *     const data = await lireJson<{ imported?: number }>(res)
 */
export async function lireJson<T = any>(
  res: Response
): Promise<T & { error?: string }> {
  let texte: string
  try {
    texte = await res.text()
  } catch {
    // La connexion a lâché pendant la lecture du corps.
    return { error: `Réponse interrompue (${res.status}).` } as T & { error: string }
  }

  // 204, ou une route qui ne renvoie rien : ce n'est pas une anomalie.
  if (texte.trim() === '') return {} as T & { error?: string }

  try {
    const valeur = JSON.parse(texte)
    // `JSON.parse('null')` et `JSON.parse('42')` réussissent sans rendre un
    // objet — l'appelant ferait alors `json.error` sur un nombre.
    if (valeur === null || typeof valeur !== 'object') {
      return { error: `Réponse inattendue du serveur (${res.status}).` } as T & { error: string }
    }
    return valeur as T & { error?: string }
  } catch {
    return { error: `Réponse inattendue du serveur (${res.status}).` } as T & { error: string }
  }
}
