# Brancher Outlook — ce qu'il reste à faire

Tout le code est écrit. Il ne manque que **l'application Azure** et les deux
variables d'environnement qu'elle produit. Tant qu'elles sont absentes,
`lib/providers.ts` garde Outlook en `planned` : le bouton n'apparaît nulle
part, la route de connexion refuse la demande, et la vitrine continue
d'annoncer « Bientôt ».

> ⚠️ **Rien de ce qui suit n'a été exécuté contre l'API réelle.** Le code est
> écrit d'après la documentation Microsoft Graph, sans boîte Outlook
> connectée. Comptez une passe de corrections à la première connexion — c'est
> normal, et c'est précisément pourquoi `status` reste `planned`.

---

## 1 · Créer l'application Azure

Sur [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** →
**Inscriptions d'applications** → **Nouvelle inscription**.

| Champ | Valeur |
|---|---|
| Nom | Sveltly |
| Types de comptes pris en charge | **Comptes dans un annuaire organisationnel quelconque et comptes Microsoft personnels** |
| URI de redirection | **Web** → `http://localhost:3000/api/mailboxes/callback` |

Le type de comptes importe : restreint à un seul annuaire, les adresses
`@outlook.com` et `@hotmail.com` seraient refusées.

Ajoutez ensuite l'URI de production : **Authentification** → **Ajouter un URI**
→ `https://<votre-domaine>/api/mailboxes/callback`.

## 2 · Permissions

**Autorisations d'API** → **Microsoft Graph** → **Autorisations déléguées** :

- `offline_access` — **la plus importante**. Sans elle, Microsoft n'émet
  aucun jeton de rafraîchissement et la boîte se déconnecte au bout d'une
  heure.
- `User.Read` — lire l'adresse du compte au moment de la connexion.
- `Mail.ReadWrite` — lire les messages, et les déplacer vers Archive.
- `Mail.Send` — envoyer les réponses validées.

Pas d'autorisation d'application, pas de consentement administrateur : tout
est délégué, l'utilisateur consent pour lui-même.

## 3 · Secret client

**Certificats et secrets** → **Nouveau secret client**. Copiez la **valeur**
(pas l'identifiant), elle ne sera plus affichée.

## 4 · Variables d'environnement

Dans `.env.local` :

```
MICROSOFT_CLIENT_ID=<ID d'application (client)>
MICROSOFT_CLIENT_SECRET=<la valeur du secret>
```

## 5 · Activer

Dans `lib/providers.ts`, passer Outlook de `planned` à `live` :

```ts
{ id: 'outlook', name: 'Outlook', status: 'live' },
```

Ce seul champ suffit : la vitrine arrête d'afficher « Bientôt », la FAQ et les
pages légales changent de phrase, le bouton « Ajouter une boîte Outlook »
apparaît dans les réglages et la route de connexion accepte la demande.

**À ne faire qu'APRÈS avoir connecté une vraie boîte et vu ses emails
arriver** — c'est la règle d'honnêteté du contenu (voir CLAUDE.md) : `status`
décrit ce que le code fait, pas ce qu'on espère.

---

## Ce qui est implémenté

| | Gmail | Outlook |
|---|---|---|
| Connexion OAuth | ✅ | ✅ `login.microsoftonline.com/common` |
| Plusieurs boîtes | ✅ | ✅ |
| Lecture des messages | ✅ | ✅ `/me/mailFolders/inbox/messages` |
| Déduplication inter-boîtes | ✅ Message-ID | ✅ `internetMessageId` |
| Archivage automatique | ✅ étiquette | ✅ déplacement vers `archive` |
| Archiver / lu / non lu | ✅ | ✅ |
| Pièces jointes | ✅ | ✅ `/attachments/{id}` |
| Envoi d'une réponse | ✅ | ✅ `/me/sendMail` |
| Synchro incrémentale | ✅ historyId | ❌ voir ci-dessous |

Tout le reste — analyse IA, résumés, détection de rendez-vous, création de
tâches, calcul du temps économisé — ne sait pas d'où vient un email et n'a
donc rien demandé : les messages Outlook sont normalisés dans exactement la
même forme que les messages Gmail.

## Limites connues, et pourquoi

**Pas de synchronisation incrémentale.** Graph propose des requêtes delta,
qui rendent un `deltaLink` à conserver d'une synchro à l'autre. Le stocker
demanderait une colonne : `history_id`, qui sert à Gmail, contient un entier
court, et y glisser une URL de plusieurs centaines de caractères est un pari
sur un schéma que ce dépôt ne décrit pas — la table `mailboxes` a été créée
directement dans Supabase. En attendant, chaque synchro relit la fenêtre de
7 jours : un appel de liste, filtré côté serveur Graph.

**Les pièces jointes ne sont pas listées à la synchro.** Graph demande un
appel séparé par message, soit jusqu'à 300 appels de plus à chaque synchro
complète. `hasAttachments` suffit à savoir qu'il y en a ; la liste se charge
à l'ouverture du message.

**Une réponse part de Gmail si les deux fournisseurs sont connectés.** Un
envoi n'a pas d'identifiant de message à sonder, contrairement aux autres
actions : impossible de deviner le fournisseur. C'est le comportement
historique du mode multi-boîte, pas une régression d'Outlook — le corriger
demande que le client transmette la boîte d'origine du message.

**L'agenda reste Google Calendar.** `Calendars.ReadWrite` et
`/me/events` n'ont pas été branchés : c'est un deuxième chantier, avec son
propre flux OAuth (voir `app/api/calendar/connect`).

## Première connexion : quoi surveiller

1. Le consentement Microsoft doit lister les quatre permissions. S'il en
   manque une, l'appel correspondant échouera en 403 plus tard.
2. Dans les journaux serveur, `Erreur échange code OAuth Microsoft` donne le
   message exact de Microsoft — presque toujours une URI de redirection qui
   ne correspond pas au caractère près.
3. Après quelques jours, vérifier que la boîte est toujours connectée : c'est
   le test du jeton de rafraîchissement. Microsoft fait tourner ces jetons et
   invalide l'ancien ; le code réenregistre celui qui revient à chaque
   rafraîchissement (`refreshOutlookToken`), mais c'est le genre de détail qui
   ne se vérifie qu'avec le temps.
