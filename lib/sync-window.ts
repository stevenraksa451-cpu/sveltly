// lib/sync-window.ts
// Combien d'emails Sveltly remonte, et jusqu'où. Source unique pour Gmail
// (app/api/emails/route.ts) et Outlook (lib/outlook-fetch.ts), qui portaient
// chacun sa copie des deux valeurs — avec un commentaire demandant de les
// garder identiques, ce qui est précisément la façon dont deux constantes
// finissent par diverger.

/**
 * Jusqu'où remonte une PREMIÈRE synchro (ou une remise à zéro).
 *
 * Filtré côté fournisseur — `newer_than:Nd` pour Gmail, `$filter` sur
 * `receivedDateTime` pour Graph — jamais après coup : aucun appel dépensé sur
 * des messages hors fenêtre.
 *
 * ⚠️ Pour Outlook, cette fenêtre s'applique à CHAQUE synchro, pas seulement à
 * la première : il n'y a pas encore de synchronisation incrémentale côté
 * Graph (voir lib/outlook-fetch.ts et OUTLOOK.md). La raccourcir ferait donc
 * perdre des emails à qui n'ouvre pas l'application pendant plus longtemps
 * que la fenêtre. C'est la raison pour laquelle elle reste à 7 jours alors
 * que le plafond, lui, a été divisé par cinq.
 */
export const FENETRE_PREMIERE_SYNCHRO_JOURS = 7

/**
 * Plafond d'emails remontés par une première synchro, indépendamment de la
 * fenêtre : une boîte très active peut accumuler beaucoup de messages en
 * sept jours.
 *
 * 150, ET C'EST UN ARBITRAGE ENTRE DEUX COÛTS RÉELS.
 * Une analyse coûte ~1 529 tokens (4 587 mesurés pour un lot de 3). Le palier
 * gratuit Groq donne 200 000 tokens par JOUR — pour l'application entière,
 * une seule clé, tous comptes confondus.
 *
 *      300 emails × 1 529 = ~459 000 tokens, soit 2,3 jours de budget
 *      150 emails × 1 529 = ~229 000 tokens, soit ~1,1 jour
 *       60 emails × 1 529 =  ~92 000 tokens, soit une demi-journée
 *
 * À 300, le deuxième inscrit d'une même semaine n'avait plus de produit : sa
 * synchro s'arrêtait sur la limite quotidienne, les emails restaient
 * `pending`, et l'attente se comptait en jours.
 *
 * ⚠️ Le plafond est passé par 60 avant de se poser à 150, et c'est une
 * correction de ma part : 60 avait été calibré sur un volume d'inscriptions
 * supposé, pas mesuré. La consommation RÉELLE est de ~10 000 tokens par jour
 * (159 analyses en 24 jours, tous comptes confondus), soit **5 % du budget**.
 * Prudence payée avec la seule chose que le produit ne peut pas refaire : la
 * première impression. L'utilisateur connectait sa boîte et en voyait une
 * fraction.
 *
 * À remesurer si les inscriptions s'accélèrent — c'est la consommation
 * quotidienne réelle qui tranche, pas l'intuition.
 *
 * La fenêtre de 7 jours est conservée : les fournisseurs rendent les messages
 * du plus récent au plus ancien, donc sur une boîte active c'est le plafond
 * qui mord en premier et la fenêtre ne coûte rien de plus. Sur une boîte
 * calme — moins de 150 emails en une semaine — elle donne au contraire une
 * première impression plus complète, gratuitement.
 *
 * Les emails au-delà du plafond ne sont pas « perdus » : ils ne sont pas
 * synchronisés, et le resteront tant que la boîte n'est pas remise à zéro.
 */
export const PLAFOND_PREMIERE_SYNCHRO = 150
