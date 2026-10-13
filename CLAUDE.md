# Sveltly

Application de tri d'emails par IA pour indépendants. Next.js 15 (App Router),
React 19, Supabase, Groq. Interface en français, vouvoiement.

---

## Décisions à ne pas défaire

Ces points ont été tranchés après analyse. Les revisiter demande une raison —
pas un réflexe.

### Dépendances : ne rien ajouter sans demander

Le projet n'a **ni shadcn/ui, ni Radix, ni framer-motion, ni lucide-react**, et
c'est délibéré. Tout est en **CSS Modules + SVG inline**. Les animations
(cascade, easing type ressort, compteurs, parallaxe, pause hors écran) sont
faites en CSS + `IntersectionObserver`. Ajouter framer-motion coûterait ~40 kB
gz sur des pages vitrine pour un résultat équivalent.

### Honnêteté du contenu — règle absolue

Le site ne décrit que ce que l'application fait **réellement**, vérifié dans le
code. Interdits, sans exception :

- **« Chiffrement de bout en bout »** — impossible ici : les emails doivent être
  lisibles côté serveur pour être analysés. La formule figurait sur la landing,
  elle a été retirée. Les pages Sécurité la démentent explicitement.
- **SOC 2, ISO 27001** ou toute certification — Sveltly n'en a aucune.
- **« Aucun mot de passe stocké »** — faux : l'app propose aussi une inscription
  email + mot de passe via Supabase Auth. Formulation correcte : Sveltly ne voit
  jamais le mot de passe **Gmail** (OAuth).
- Faux témoignages, faux logos clients, chiffres inventés.

Ce qui manque est signalé là où ça devrait se trouver (paiement Stripe, export
de données, Outlook).

#### Boîtes mail : `lib/providers.ts` est la source unique

Le site s'est contredit pendant plusieurs versions. Le hero annonçait
« Gmail & Outlook », les CGU et la politique de confidentialité parlaient d'un
« compte Gmail ou Outlook connecté », pendant que `/faq` et `/produit`
disaient qu'Outlook n'était pas supporté — les deux affirmations visibles sur
le même site, à deux clics d'écart.

`lib/providers.ts` tranche désormais pour tout le monde. Chaque fournisseur y
porte un `status` qui décrit le CODE, pas l'intention :

| `status` | sens | affichage |
|---|---|---|
| `live` | une route OAuth existe et fonctionne | nom en encre pleine |
| `planned` | décidé et spécifié, pas branché | nom pâli + pastille « Bientôt » |

Les pages lisent `PROVIDERS` (logos du hero), `PROVIDERS_LIVE_LABEL` (toute
phrase qui décrit le fonctionnement réel : étapes, CGU, confidentialité) ou
`PROVIDERS_ANSWER` (« quelles boîtes puis-je connecter ? »). Le jour où
Outlook est branché, un seul `status` à basculer et les sept endroits suivent
ensemble. **Ne jamais réécrire « Gmail » ou « Outlook » en dur** dans une page
publique : c'est précisément comme ça que la contradiction est née.

Et jamais de date. « Bientôt » sans échéance est une intention ; « en mars »
est une promesse, et on n'en fait pas.

### Prix

**Pro = 12 €/mois** (9,60 € en annuel). Source unique : `lib/plans.tsx`, qui
alimente aussi l'onglet Forfait dans l'app. Ne jamais redéclarer un prix
ailleurs.

### Thème

La landing, l'auth et l'onboarding restent **en clair uniquement**. Voir le
commentaire dans `lib/theme.ts` et la fonction `resetTheme()` qui empêche le
thème sombre de fuiter. Le CSS de la landing a des couleurs en dur : un
sélecteur de thème produirait une page cassée tant qu'une passe dark complète
n'a pas été faite.

### `overflow-x: clip`, pas `hidden`

Dans `styles/globals.css`, `html` et `body` utilisent `overflow-x: clip`.
`hidden` force `overflow-y: auto` et fait de l'élément un conteneur de
défilement, ce qui **casse la barre de navigation en `position: sticky`**.

---

## Structure

```
app/
  page.tsx              landing (hero + sections, navbar + SiteFooter)
  (marketing)/          21 pages vitrine — groupe de routes, layout commun
  (app)/                espace connecté : dashboard, inbox, tasks, calendar, settings
  api/                  routes serveur (emails, analyze, calendar, mailboxes…)
components/
  landing/nav/          barre de navigation (Navbar, MegaMenu, MobileMenu)
  marketing/            gabarits, visuels, spots, chrome de page
lib/
  brand.ts              nom, accroches, CTA
  navigation.ts         SOURCE UNIQUE : navbar + pied de page + « voir aussi » + sitemap
  content/              contenu typé des pages marketing
  plans.tsx             prix et limites
  time-saved.tsx        calcul du temps économisé
```

### Navigation

`lib/navigation.ts` est la **seule** source des liens. Ajouter une page = une
entrée ici, et elle apparaît dans la navbar, le pied de page et le sitemap.

### Pages marketing — 5 gabarits

Répartis pour que deux pages voisines ne se ressemblent jamais :

| Gabarit | Pages |
|---|---|
| `EditorialPage` | `/produit`, `/securite`, `/securite/protection-des-donnees`, `/produit/calculateur-tjm`, `/tarifs`, `/faq`, `/contact`, `/changelog` |
| `BeforeAfterPage` | `/produit/tri-intelligent`, `/solutions/designers` |
| `DemoPage` | `/produit/resume-du-jour`, `/produit/agenda`, `/securite/donnees-gmail`, `/solutions/redacteurs-traducteurs` |
| `DayPage` | `/produit/taches`, `/solutions/developpeurs` |
| `StoryPage` | `/produit/reponses-ia`, `/solutions`, `/solutions/consultants`, `/securite/controle-de-vos-donnees` |

**Pas de grille de trois cartes identiques sous un hero.** Les listes de
sous-pages sont des listes à filets (`HubList`), pas des cartes.

### Largeurs

Tokens dans `styles/marketing.css`, portés par `.mk` (corps de page) **et**
`.mkc` (chrome : barre de navigation, pied de page, racine de la landing) :

- `--mk-max: 1440px` — largeur du **conteneur**
- `--mk-gutter: clamp(20px, 4.5vw, 64px)` — **gouttière**
- `--mk-measure: 64ch` — largeur de la **colonne de texte**

C’est la **seule** source de largeur du site public. La navbar (1200 + 48), le
pied de page (1120 + 48) et les sections de la landing (1200 + 48) avaient
chacun la leur : sur une même page, logo, titre et colonnes du pied tombaient
à 110, 214 et 254 px. Ne pas réintroduire de `max-width` en dur.

Le pied de page se pose **hors** du conteneur des gabarits — dans
`app/(marketing)/layout.tsx`, pas dans `PageTail` — sinon son bandeau
s’arrête à la gouttière au lieu d’aller d’un bord à l’autre.

Les deux sont distincts volontairement : le conteneur occupe l'écran, le texte
reste lisible. L'espace gagné sert aux visuels, apartés et illustrations.

⚠️ **Piège rencontré** : `ch` se calcule sur la police de l'élément qui le
porte. Un `max-width: 20ch` sur un conteneur à 1rem vaut ~200 px et écrase un
titre à 4rem. La mesure doit être portée par le titre lui-même.

### Palette

Tokens `--mk-*` scopés sous `.mk` et `.mkc` pour **ne pas repeindre le
dashboard**. `.mkc` ne pose que les variables (aucun fond, aucune encre) : il
sert au chrome, qui vit hors de `.mk` sur la landing.

Un seul bouton principal pour tout le site public — rayon 10 px, même forme
partout. La barre de navigation, les boutons de la landing (`heroCta`,
`planBtn`, `ctaBannerBtn`) et `PageChrome .ctaButton` la partagent : le même
libellé s’affichait en pilule `#3730A3` dans la barre et en rectangle
`#3F4A8A` dans la page, souvent à l’écran en même temps.

**La palette est définie dans `styles/globals.css` et nulle part ailleurs.**
`styles/marketing.css` ne porte plus de valeur propre : les ~100 noms `--mk-*`
sont des alias. Voir la section « Espace connecté » plus bas pour les tokens.

### Couleur : indigo + trois compagnons

La version « un seul accent indigo sur du blanc » était juste, mais froide et
plate. Trois teintes l’accompagnent — `--hue-violet`, `--hue-teal`,
`--hue-amber` — avec une règle stricte :

- Elles ne servent QUE dans des **dégradés**, des **halos** et des
  **pastilles très pâles** (`--tint-*-bg` / `--tint-*-fg`).
- **Jamais en aplat plein** à côté du bouton principal : celui-ci reste le
  seul élément saturé cliquable de l’écran.
- Un seul dégradé de marque, `--grad-brand`, réutilisé partout (boutons,
  pastilles « Recommandé », points). Trois arrêts : à deux, le milieu d’un
  indigo→violet vire au mauve sale.
- Un seul texte en dégradé sur tout le site, le chiffre de la section vitesse.

Les nappes de fond (hero, appel à l’action final) restent **sous 11 %
d’opacité** et **ne bougent pas** : au-delà elles se voient comme des taches,
et un fond qui dérive en boucle derrière un titre fatigue avant d’impressionner.

⚠️ **Filet dégradé** : toujours en `background` (`padding-box` +
`border-box`), jamais en `border-image` — ce dernier ignore `border-radius` et
ressort un cadre à angles droits sur une carte arrondie.

Les quatorze paires couleur/fond introduites sont vérifiées AA
(4,81:1 au minimum) — le script est dans la section Vérification.

---

## Espace connecté — cadre et cartes

Tokens dans `styles/globals.css`. Comme pour la vitrine, ce sont des sources
uniques : ne pas réécrire ces valeurs à la main.

| Token | Rôle |
|---|---|
| `--content-max` | largeur du contenu, portée par `<main>` **et** par la barre du haut |
| `--radius-card` | forme d'une carte de premier plan (colonne, panneau) |
| `--radius-card-sm` | bloc imbriqué, carte secondaire empilée, barre d'outils |
| `--card-pad` | gouttière intérieure d'une carte |
| `--card-gap` | écart entre deux cartes |

Le rayon asymétrique était redéclaré dans 25 fichiers avec **cinq** valeurs
(18, 20, 22, 24, 28 px) : deux cartes voisines n'avaient pas le même profil.
Une seule exception documentée, `ProductPreview` (cadre de 480 px de haut).

Règles qui vont avec :

- **Filet** : `--border` sur une carte de premier plan, `--border-light` sur
  une carte secondaire. Pas d'ombre plus marquée sur une carte que sur sa
  voisine de même rang — côte à côte, ça se lit comme un accident, pas comme
  une hiérarchie.
- **Navigation** : pastille indigo pleine pour la barre latérale principale,
  pastille teintée pour une navigation secondaire dans la page (Réglages,
  Tâches). Les deux sont visibles en même temps à l'écran.
- **Colonnes de page** : 24 px entre une colonne de navigation et le contenu,
  `--card-gap` entre deux cartes.
- Les trois colonnes du tableau de bord partagent
  `components/dashboard/card.module.css` via `composes`. Coque, en-tête et
  pied s'y trouvent — ne rien redéclarer dans les modules des cartes.
- **Pas de sélecteur de thème dans la barre du haut** : il vit dans
  Réglages → Apparence et sur `/settings/personalization`.

### Thème sombre : vraiment sombre, et neutre

Fond `#0A0A0A`, cartes `#141414`, surfaces secondaires `#1C1C1C` — trois
paliers espacés d'environ 5 % de clarté : assez pour qu'une carte se détache
du fond, trop peu pour qu'elle paraisse grise. La version précédente était un
gris **chaud** à `#1C1917` avec des cartes à `#262220` : sur un écran
lumineux, ça ne passait pas pour du sombre, ça passait pour du marron.

Neutre, là où le thème clair est chaud, et ce n'est pas une incohérence : une
teinte chaude donne de la chaleur sur un fond clair, mais du brun sale sur du
quasi-noir. Le fond n'est pas `#000000` pur non plus — du blanc sur du noir
absolu produit un halo (irradiation) qui fatigue à la lecture, et sur dalle
OLED les transitions depuis `#000` laissent une traînée. `#0A0A0A` coûte un
point de contraste et supprime les deux.

⚠️ **`--on-accent`, jamais `white` en dur.** L'accent est un indigo profond
en clair (`#4F46E5`, blanc dessus = 6,3:1) mais **éclairci** en sombre
(`#818CF8`) pour rester lisible comme couleur de lien — et le blanc dessus y
tombe à 2,98:1. C'est l'encre qui s'inverse, pas l'accent : le rabaisser
rendrait tous les liens illisibles sur le fond noir. 34 règles corrigées.

⚠️ **Ne jamais utiliser un token d'ENCRE comme fond.** Le bandeau de `/help`
posait `background: var(--color-ink)`. En sombre, `--color-ink` vaut
`#FAFAFA` : le bandeau devenait un bloc blanc portant du texte blanc, sans
aucune erreur ni avertissement. Un fond se prend dans `--bg`, `--bg-card` ou
`--bg-subtle`, qui suivent le thème dans le bon sens.

Même piège sur les éléments non textuels : une pastille d'interrupteur en
blanc dur donnait 2,98:1 sur la piste accent du thème sombre, sous le seuil
de 3:1. Elle prend `--bg-card`, qui s'inverse.

La vitrine, elle, reste claire en toutes circonstances : le garde-fou
`[data-theme='dark'] .mk, .mkc` de `styles/marketing.css` redonne les valeurs
claires — les alias `--mk-*` **et** la trentaine de tokens de base que le CSS
vitrine lit directement. Ajouter une couleur au CSS de la landing demande de
l'ajouter à cette liste, sinon elle s'inversera le temps d'une image lors
d'une navigation depuis l'espace connecté.

---

## Tâches — taxonomie et provenance

`lib/tasks.ts` est la source unique : catégories (jeu fermé de 9), priorités,
et la traduction email → tâche. Trois règles à ne pas reperdre :

- `tasks.category` ne contient QUE une valeur de `TASK_CATEGORIES`. Le nom de
  l'expéditeur va dans `tasks.source_label` (migration
  `20261002000000_tasks_category_source.sql`). Les deux vivaient dans la même
  colonne, ce qui faisait lister des contacts dans le filtre par catégorie.
- **Jamais d'upsert qui réécrit une tâche existante** depuis un email. La clé
  `(user_id, from_email_id)` entre en conflit à chaque ré-analyse : un upsert
  classique décochait les tâches déjà terminées et écrasait les modifications
  manuelles. Passer par `insertTaskSafely`, qui pose `ignoreDuplicates`.
- La priorité de la tâche tient compte de celle de l'EMAIL. L'IA ne produit
  jamais `urgent` d'elle-même : sans `resolveTaskPriority`, la ligne
  « Urgent » de /tasks restait à zéro quoi qu'il arrive.

Le prompt de `/api/analyze` décide le TYPE d'email par élimination ordonnée
(13 règles numérotées, le premier cas qui s'applique gagne). Ne pas le
retransformer en liste plate : c'est l'ordre qui tranche les cas ambigus
(facture envoyée par un client → `invoice`, pas `client_request`).

---

## Mesure et SEO

- `lib/perf.ts` chronomètre chaque action (`timed` / `startAction`) et observe
  les Core Web Vitals. Inerte en production sauf `NEXT_PUBLIC_PERF=1`.
  `window.__perf()` rend la synthèse dans la console.
- Le titre d'onglet est composé par `title.template` du layout racine. Les
  pages passent un titre **nu** — y ajouter « — Sveltly » le double.
- `app/page.tsx` est une coquille SERVEUR qui porte les métadonnées et le
  JSON-LD ; la landing interactive vit dans `app/LandingPage.tsx`. Ne pas
  remettre `'use client'` sur `app/page.tsx` : la page perdrait sa canonique,
  son Open Graph et ses données structurées.
- `lastModified` du sitemap est figé (`CONTENT_LAST_MODIFIED`). Le remettre à
  `new Date()` annonce à Google que les 21 pages changent à chaque requête —
  le signal finit ignoré. À mettre à jour quand le contenu change vraiment.

### Budget de tokens Groq — à surveiller à chaque modification du prompt

Le palier gratuit impose **200 000 tokens par JOUR** (en plus de la limite par
minute). C'est la limite qui mord réellement — message relevé sur ce projet :

```
on tokens per day (TPD): Limit 200000, Used 195614, Requested 4587
```

Les deux limites comptent le prompt + les emails + les **max_tokens réservés**,
pas les tokens réellement produits.

| | avant | après |
|---|---|---|
| prompt système | ~4 900 tokens | **~2 180** |
| requête de 3 emails | ~8 800 | **4 587 (mesuré)** |
| emails analysables/jour | ~68 | **~130** |

Au-delà, l'analyse s'arrête au milieu d'une synchro et les emails restent
`pending`. Si vous étoffez le prompt (nouvelles règles, exemples), **mesurez** :
`usage.prompt_tokens` de la réponse Groq dit la vérité, pas l'intuition. La
prose explicative coûte le même prix que les règles — les justifications
vivent dans les commentaires du code, jamais dans le prompt.

**Le levier décisif est ailleurs : ne jamais réanalyser.**
`lib/email-analysis-store.ts` conserve le résultat de chaque analyse en base
(table `email_analyses`). Avant, le seul cache était une Map en mémoire de
5 minutes qui disparaissait à chaque démarrage à froid — donc quasiment
toujours en production : les mêmes emails repayaient leur analyse plusieurs
fois par jour. Un email analysé une fois ne l'est désormais plus jamais, sauf
si le ton ou la langue de réponse change (mémorisés avec l'analyse).

Seul le RÉSULTAT est stocké, jamais le corps de l'email : le dupliquer
durablement changerait la nature des données conservées, ce qui demande une
décision explicite et une mise à jour de la politique de confidentialité.

Les trois leviers suivants, par ordre de rendement : taille du prompt · `maxTokensFor`
(réservation dimensionnée sur le lot, pas forfaitaire) · `EMAIL_CHARS_FOR_ANALYSIS`.

### Le quota mensuel compte des RÉPONSES, pas des emails

`aiRepliesPerMonth` (50 au forfait Gratuit) ne doit décompter que les emails
qui reçoivent une vraie réponse — voir `countBillableReplies` et
`NO_REPLY_EMAIL_TYPES` dans `/api/analyze`. Une pub, une newsletter, un spam
ou une notification reçoit un brouillon qui dit « Aucune réponse nécessaire » :
la facturer contredit la page Tarifs, qui promet « 50 réponses IA par mois ».

Le compteur s'incrémentait du nombre d'emails ANALYSÉS. Cas réel relevé sur un
compte de test : **51/50 consommés**, essentiellement sur des notifications
Google, un code 2FA Instagram et une promo ChatGPT — zéro réponse réelle.
Le tri, les résumés et la détection de tâches restent gratuits pour ces types.

---

### Deux règles tirées de mesures Lighthouse réelles

**1. Rien au-dessus de la ligne de flottaison ne part à `opacity: 0`.**
`Reveal` (landing et marketing) révèle au défilement en partant de
`opacity: 0`. Appliqué au `h1`, cela rend la page vide pour Google jusqu'à
l'hydratation : LCP mesuré à **11,9 s** sur la page d'accueil, dont 11,4 s de
« render delay ». Utiliser la prop **`immediate`** sur le hero — opaque dès le
HTML du serveur, entrée animée sur la seule translation. Ne jamais animer
l'opacité d'un contenu visible d'emblée.

**2. Les images passent par `next/image`.**
`public/logo.png` fait 1536×1024 pour 1 Mo et s'affiche à 32 px. En `<img>`
brute, ce mégaoctet partait tel quel — et `app/icon.png` / `app/apple-icon.png`
en étaient deux copies, servies telles quelles par Next (le dossier `app/`
n'est pas optimisé : ces fichiers doivent être physiquement petits).
Poids total de la page d'accueil : **2 580 Ko → 394 Ko**.

Scores mesurés (`npm run build` + `npm run start`, Lighthouse mobile) :

| Page | Perf | A11y | Bonnes pratiques | SEO | LCP |
|---|---|---|---|---|---|
| `/` | 87 | 100 | 100 | 100 | 3,6 s |
| `/produit` | 95 | 100 | 100 | 100 | 2,7 s |
| `/faq` | 90 | 100 | 100 | 100 | 3,5 s |
| `/tarifs` | 89 | 100 | 100 | 100 | 3,7 s |

Trois corrections ont porté ces chiffres, toutes trouvées en mesurant plutôt
qu'en devinant :

1. **Police variable plutôt que graisses statiques.** Déclarer
   `weight: ['400','500','600']` et `style: ['normal','italic']` faisait
   télécharger six fichiers, **113 Ko** — deuxième poste de la page après le
   JavaScript. Sans `weight`, `next/font` prend la police variable : un seul
   fichier, 62 Ko au total. L'italique est partie avec ; le mot mis en avant
   dans le titre du hero garde son dégradé, qui portait déjà l'emphase.
2. **Space Grotesk en `preload: false`.** Elle ne sert qu'au mot « Sveltly »
   (`Brand.tsx`, `Logo.tsx`) mais occupait 48 Ko du chemin critique,
   préchargée avant le texte que le visiteur vient lire.
3. **La landing est un composant SERVEUR.** Un seul `useState` — la bascule
   mensuel/annuel des tarifs — suffisait à faire partir toute la page au
   navigateur : hero, étapes, fonctionnalités, sécurité, FAQ, appel à
   l'action. Il vit désormais dans `components/landing/PricingSection.tsx`.
   **Ne pas remettre `'use client'` sur `app/LandingPage.tsx`.**

### Vérifier une couleur sur UNE surface ne suffit pas

Lighthouse est tombé à 89 en accessibilité sur un seul texte : la ligne de
copyright du pied de page, à 4,39:1. `--text-muted` avait été vérifié sur le
fond de page (`#FAFAF9`, 4,59:1) — mais pas sur `#F5F5F4`, la surface la plus
sombre du système clair, qui porte le bandeau du pied et la barre latérale.
Un token d'encre doit passer AA sur **toutes** les surfaces où il peut
atterrir, pas sur celle qu'on avait en tête en l'écrivant.

Même passe : un `<ol>` dont les enfants directs étaient des `<div>` (chaque
carte était enveloppée dans un `Reveal`, qui insère un div) n'est plus une
liste pour un lecteur d'écran. Une cascade d'entrée se fait en CSS sur les
`:nth-child`, pas en enveloppant chaque `<li>`.

Testé et **écarté** : `experimental.cssChunking: 'strict'`. Mesuré à 85 contre
86 — plus de requêtes, aucun gain. Ne pas le réintroduire sans le remesurer.

### Deux règles pour une animation qui boucle

Tirées d'un vrai défaut : la page « sautait » à chaque tour de l'aperçu
produit du hero (`ProductPreview`, boucle de 9 s).

**1. Le keyframe 100 % doit être identique au 0 %.** Une animation infinie
repasse de 100 % à 0 % en UNE image, sans transition. Les cinq séquences se
terminaient sur l'état « visible » et repartaient de « caché » : tout
disparaissait d'un coup à chaque bouclage. Elles finissent maintenant sur
l'état de départ, après un fondu de sortie de 12 % de la boucle.

**2. Ne jamais animer une propriété de mise en page.** L'arrivée de l'email
animait `max-height` de 0 à 92 px. Au bouclage, la ligne retombait à zéro en
une image et tout ce qui se trouvait dessous remontait de 92 px — c'était ça,
le saut. Seuls `opacity` et `transform` sont composés par la carte graphique
et ne déclenchent aucun recalcul. Mesuré après correction : **CLS 0**, aucun
élément décalant la page.

Corollaire : ces deux règles s'opposaient à la façon dont `prefers-reduced-motion`
était géré ici — on comptait sur le fait que le dernier keyframe était l'état
visible et que la règle globale ramenait la durée à ~0. Les deux besoins sont
désormais **séparés** : `ProductPreview.module.css` porte son propre bloc
`@media (prefers-reduced-motion: reduce)` qui coupe les animations et pose
l'état final à la main. La boucle est alors libre de se refermer proprement.

### ⚠️ Le score d'accessibilité oscille, et c'est une limite de la mesure

Lighthouse échantillonne **une seule image**. L'aperçu du hero contient des
fondus : pendant un fondu, l'opacité partielle rapproche l'encre du fond, et
axe relève un contraste faible sur un état purement transitoire. Mesuré sur
quatre passes consécutives, sans aucune modification entre elles : 100, 96,
100, 100.

Ce n'est pas un échec WCAG — les états transitoires d'une animation n'en
relèvent pas, et le bloc entier est `aria-hidden` parce qu'il est décoratif.
Les valeurs **stabilisées** sont confortables : 7,6:1 pour le résumé, 8,9:1
pour sa pastille. Et c'est inhérent : tout fondu sur une zone contenant du
texte rend une mesure sur une seule image non fiable, quelle que soit la
couleur choisie.

Avant de chasser un `color-contrast` signalé sur `ProductPreview`, **relancer
la mesure** : s'il n'apparaît pas à tous les coups, c'est l'artefact. S'il
apparaît systématiquement, c'est un vrai défaut.

---

## Pièges connus

- **Seuils adaptatifs** : 880 px partout (gabarits, pied de page) sauf la
  barre de navigation, à **1040 px** — son contenu est incompressible (898 px
  mesurés, 1024 avec les icônes de réseaux sociaux, qui disparaissent donc
  sous 1180 px). `MegaMenu` et `MobileMenu` doivent suivre ce même 1040,
  sinon le burger s’affiche sans rien ouvrir.
- **`npm run build` pendant que `npm run dev` tourne** corrompt le cache du
  serveur de dev (`Cannot find module './XXXX.js'`). Remède : tuer node,
  supprimer `.next`, relancer.
- **Révélation au défilement** : les blocs partent à `opacity: 0` et sont
  dévoilés par `IntersectionObserver`. Un `<noscript>` dans
  `app/(marketing)/layout.tsx` les rend visibles sans JavaScript.
- **Onglet en arrière-plan** : `IntersectionObserver` et `requestAnimationFrame`
  sont suspendus. Les captures montrent alors des sections vides — c'est un
  artefact de test, pas un bug.
- **PowerShell** : `$pid` est une variable réservée. Les apostrophes droites
  dans des chaînes TS générées cassent la compilation ; utiliser `’` (U+2019).

---

## Chantiers ouverts

- **Stripe** : aucune route `api/stripe/*`, pas de colonnes
  `stripe_customer_id` / `current_period_end`. Le paiement en ligne est annoncé
  comme non branché sur `/tarifs` et `/contact`. Demande les clés avant
  d'implémenter.
- **Export de données** : absent, signalé sur
  `/securite/controle-de-vos-donnees`.
- **Outlook** : le code est écrit, l'application Azure manque. Voir
  **`OUTLOOK.md`** pour la marche à suivre complète. Résumé : créer
  l'inscription Azure, poser `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`,
  puis basculer `status` à `'live'` dans `lib/providers.ts` — **après** avoir
  connecté une vraie boîte et vu ses emails arriver, jamais avant.

  Tant que `status` vaut `planned`, rien n'est joignable : `/api/mailboxes/connect`
  refuse la demande même appelée à la main, le bouton n'est pas rendu, et la
  vitrine annonce « Bientôt ». C'est la source unique qui tient la porte.

  Les messages Graph sont normalisés dans **exactement** la même forme que les
  messages Gmail (`lib/outlook-fetch.ts`) : tout ce qui vient après — analyse,
  agenda, tâches, temps économisé — ignore d'où vient un email, et doit
  continuer de l'ignorer. Les deux bibliothèques restent séparées plutôt que
  fusionnées derrière une abstraction : les API ne se ressemblent que de loin
  (jetons, pagination, formes de message, étiquettes contre dossiers), et une
  couche commune aurait surtout servi à cacher les endroits où elles divergent.

  ⚠️ **Microsoft fait tourner les jetons de rafraîchissement**, contrairement à
  Google qui réutilise le même indéfiniment. Ne pas réenregistrer celui qui
  revient à chaque rafraîchissement condamne la boîte au premier roulement —
  elle se déconnecterait silencieusement quelques jours plus tard. Voir
  `refreshOutlookToken`.
- **`SITE_URL`** dans `lib/brand.ts` vaut `https://sveltly.fr` — à ajuster si le
  domaine final diffère, sinon sitemap et balises canoniques pointent à côté.
- **Renommage de marque** : `lib/brand.ts` ne gouverne que les pages marketing
  et la navbar. Le reste du projet contient encore « Sveltly » en dur.
- **À faire relire par le propriétaire** : le délai de réponse annoncé sur
  `/contact` (48 h ouvrées) et le support prioritaire Pro ne correspondent à
  aucun mécanisme dans le code.

---

## Vérification

```bash
npx tsc --noEmit -p tsconfig.json   # types
npm run build                       # build complet (21 pages marketing en statique)
```

**Ne jamais construire pendant que le serveur tourne** : `.next` est corrompu
et le serveur sert l’ancien build en silence. Pire, `npm run start` échoue sur
`EADDRINUSE` sans que rien ne le dise, et on mesure alors la version
précédente en croyant mesurer la nouvelle. L’ordre qui marche : tuer node,
supprimer `.next`, construire, démarrer, **vérifier un HTTP 200 avant de
regarder quoi que ce soit**.

### Éditer du CSS par script : compter les accolades, pas faire confiance à une regex

Un script de nettoyage utilisait
`(?:^/\*[\s\S]*?\*/\n)?^<sélecteur>\s*\{[^}]*\}` avec le drapeau multiligne
pour retirer une règle et son commentaire. Le `[\s\S]*?` pouvait démarrer sur
un commentaire situé des centaines de lignes plus haut : **supprimer une règle
emportait tout le bloc intermédiaire**. Le hero entier a disparu de
`app/page.module.css` sans la moindre erreur de build — les noms de classes
continuaient d’être générés par CSS Modules, seules les règles manquaient, et
ça ne s’est vu qu’à la capture d’écran.

Pour supprimer ou remplacer une règle : repérer le sélecteur en littéral,
compter les accolades jusqu’à la fermeture, ne remonter chercher un
commentaire que sur les lignes **contiguës**, et refuser d’écrire si le
fichier n’est plus équilibré.

### Vérifications utiles

- **Contraste** : un petit script WCAG sur les paires couleur/fond vaut mieux
  qu’un avis. C’est lui qui a montré que le `#A8A29E` de la maquette donnait
  2,41:1 sur le fond de page, très en dessous du minimum AA de 4,5:1.
- **Classes orphelines** : comparer les `styles.X` d’un `.tsx` aux règles de
  son `.module.css` trouve les deux sens — un `className` sans règle (effet
  silencieusement absent) et une règle sans `className` (CSS mort). Attention
  aux faux positifs : `composes` tire des classes côté CSS, et `styles[x]`
  dynamique rend l’analyse statique inopérante.
