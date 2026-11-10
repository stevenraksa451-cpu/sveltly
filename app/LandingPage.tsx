// Composant SERVEUR, et il doit le rester.
//
// Un seul `useState` (la bascule des tarifs) suffisait à faire basculer
// TOUTE la page côté client : chaque section devait alors être téléchargée
// et hydratée avant que la moindre interaction réponde. Ce morceau vit
// désormais dans components/landing/PricingSection.tsx. Les enfants qui ont
// besoin du navigateur (Navbar, Reveal, ImpactCalculator, ScrollProgress)
// portent leur propre 'use client' — un composant serveur peut les rendre
// sans devenir client lui-même.
import Link from 'next/link'
import '@/styles/marketing.css'
import Brand from '@/components/ui/Brand'
import ImpactCalculator from '@/components/landing/ImpactCalculator'
import Reveal from '@/components/landing/Reveal'
import Navbar from '@/components/landing/nav/Navbar'
import SiteFooter from '@/components/marketing/SiteFooter'
import ScrollProgress from '@/components/landing/ScrollProgress'
import ProviderMarks from '@/components/landing/ProviderMarks'
import { PROVIDERS_LIVE_LABEL } from '@/lib/providers'
import ProductPreview from '@/components/landing/ProductPreview'
import SearchPaletteMock from '@/components/landing/SearchPaletteMock'
import { VignetteAgenda, VignetteTaches, VignetteFocus, VignetteCloison } from '@/components/landing/FeatureVignettes'
import HeroWord from '@/components/landing/HeroWord'
import HeroAmbience from '@/components/landing/HeroAmbience'
import PricingSection from '@/components/landing/PricingSection'
import PriorityBadge from '@/components/ui/PriorityBadge'
import { IconCalendar, IconFocus, IconLock, IconShield, IconSync, IconCheckSquare, IconCode, IconPalette, IconBriefcase, IconPen, IconUsers, IconKey, IconDatabase, IconTrash } from '@/components/landing/icons'
import { SAVINGS_RATIO } from '@/lib/time-saved'
import styles from './page.module.css'

// Repère affiché dans le badge du hero ET dans le simulateur, pour que les
// deux chiffres de la page concordent — un visiteur qui fait défiler retrouve
// exactement le même résultat. Remplace un « 8 h gagnées par semaine en
// moyenne » qui annonçait une moyenne mesurée sur une base d'utilisateurs
// que le produit, tout juste lancé, n'a pas encore.
//
// Hypothèse de départ du simulateur, VOLONTAIREMENT sous la source citée :
// le McKinsey Global Institute (« The social economy », 2012) mesure 28 % de
// la semaine de travail consacrés aux emails, soit 11,2 h sur 40 h. On part
// de 8 h, et le visiteur peut changer le curseur.
//
// ⚠️ HOURS_GIVEN_BACK est le produit d'un MODÈLE, pas d'une mesure :
// SAVINGS_RATIO se déduit des durées estimées par action de
// lib/time-saved-calcul.ts. Aucun utilisateur n'a été chronométré. C'est
// pour ça que tous les endroits qui l'affichent portent « estimé » ou
// renvoient au détail du calcul — un ordre de grandeur annoncé comme un
// résultat serait exactement le chiffre inventé que la règle d'honnêteté
// du contenu interdit.
const BASELINE_EMAIL_HOURS = 8
const HOURS_GIVEN_BACK = Math.round(BASELINE_EMAIL_HOURS * SAVINGS_RATIO)

// Les 4 fonctionnalités "secondaires" de la grille bento (tuiles simples,
// icône + texte) — les 3 principales (tri, réponses IA, calendrier) ont
// chacune un mini-aperçu dédié, écrit directement dans le JSX ci-dessous
// plutôt que dans ce tableau, pour ne pas forcer des visuels différents
// dans une structure de données commune.
const SMALL_FEATURES = [
  { number: '03', icon: <IconCalendar />, vignette: <VignetteAgenda />, title: 'Agenda automatique', desc: 'Les rendez-vous et réunions mentionnés dans vos emails sont détectés, avec leur date et leur heure. L’ajout automatique à l’agenda s’active dans les réglages ; sinon, un bouton vous le propose email par email.' },
  { number: '04', icon: <IconCheckSquare />, vignette: <VignetteTaches />, title: 'Tâches automatiques', desc: <><Brand /> repère les actions à faire dans vos emails et les transforme en tâches, classées et prêtes à traiter — sans que vous ayez à les recopier.</> },
  { number: '06', icon: <IconFocus />, vignette: <VignetteFocus />, title: 'Zéro distraction', desc: 'Une interface pensée pour aller à l’essentiel. Pas de notifications inutiles, pas de complexité. Juste vos emails, organisés.' },
  // "Chiffrement de bout en bout" retiré : le produit ne l'implémente pas et
  // ne peut pas l'implémenter — les emails doivent être lisibles côté serveur
  // pour être analysés. Remplacé par ce qui est réellement en place (voir la
  // section #securite et components/landing/nav/navConfig.tsx).
  { number: '07', icon: <IconLock />, vignette: <VignetteCloison />, title: 'Vos données restent privées', desc: 'Données cloisonnées compte par compte, jetons de connexion chiffrés au repos. Le contenu analysé passe par notre prestataire d’IA, qui s’interdit contractuellement de l’utiliser pour entraîner ses modèles — et par personne d’autre.' },
]

// Cibles des entrées du menu "Solutions". Volontairement factuel : chaque
// ligne décrit ce que le produit fait déjà pour ce métier, sans promesse
// chiffrée ni témoignage inventé.
const SOLUTIONS = [
  { icon: <IconCode />, title: 'Développeurs', desc: <>Les demandes qui peuvent attendre descendent d’elles-mêmes dans la liste. Vos plages de concentration ne sont interrompues que par ce qui est réellement urgent.</> },
  { icon: <IconPalette />, title: 'Designers', desc: 'Les retours clients arrivent résumés en une phrase, avec les points clés extraits — vous voyez ce qui est demandé avant d’ouvrir le fil.' },
  { icon: <IconBriefcase />, title: 'Consultants', desc: 'Une relance qui devient pressante est classée urgente avant qu’elle ne vous coûte un client. Les réunions mentionnées sont repérées, date et heure comprises, prêtes à poser dans l’agenda.' },
  { icon: <IconPen />, title: 'Rédacteurs & traducteurs', desc: <>Un brief, une échéance, une consigne : <Brand /> en fait une tâche datée, sans que vous ayez à recopier quoi que ce soit.</> },
  { icon: <IconUsers />, title: 'Indépendants multi-clients', desc: 'Plusieurs boîtes Gmail réunies dans une seule vue, triées ensemble, avec les doublons écartés automatiquement. Le forfait Gratuit en connecte une ; au-delà, c’est le Pro.' },
]

// Affirmations de sécurité. Chacune est vérifiable dans le dépôt — voir
// components/landing/nav/navConfig.tsx, qui liste les références. Rien n'est
// affirmé au-delà : aucune certification, aucune promesse de chiffrement
// de bout en bout.
const SECURITY_POINTS = [
  { icon: <IconKey />, title: 'Connexion Gmail par OAuth', desc: 'Vous autorisez Sveltly depuis Google. Votre mot de passe Gmail ne transite jamais par nos serveurs, et nous ne pouvons pas le connaître.' },
  { icon: <IconDatabase />, title: 'Données cloisonnées par compte', desc: 'La base applique le Row Level Security : une requête ne peut techniquement retourner que vos propres lignes, jamais celles d’un autre utilisateur.' },
  { icon: <IconShield />, title: 'Jetons chiffrés au repos', desc: 'Les jetons d’accès Google sont chiffrés en AES-256-GCM avant stockage, avec une clé qui ne quitte jamais le serveur.' },
  { icon: <IconLock />, title: 'Usage limité des données Gmail', desc: 'Vos emails servent à les trier, les résumer et proposer des réponses — rien d’autre. Jamais de revente, jamais d’entraînement de modèle.' },
  { icon: <IconTrash />, title: 'Suppression définitive', desc: 'Un bouton dans vos réglages supprime le compte, les données associées et les jetons de connexion. Sans délai et sans démarche à faire.' },
]

// Chaque étape porte un fragment d'interface réel plutôt qu'une icône
// abstraite : une icône de cadenas n'apprend rien, un bouton « Autoriser »
// montre ce qui va effectivement s'afficher.
const STEPS = [
  {
    number: '1',
    // PROVIDERS_LIVE_LABEL, pas « Gmail ou Outlook » en dur : cette étape
    // décrit ce qu'on peut faire maintenant, et Outlook n'est pas branché.
    title: 'Connectez votre boîte',
    desc: <>{PROVIDERS_LIVE_LABEL}, via OAuth. <Brand /> ne voit jamais votre mot de passe.</>,
    visual: (
      <div className={styles.stepConnect}>
        <ProviderMarks compact />
        <span className={styles.stepConnectBtn}>Autoriser</span>
      </div>
    ),
  },
  {
    number: '2',
    title: 'L’IA trie et résume',
    desc: 'Chaque message est classé par priorité, résumé en une ligne, et les tâches qu’il contient en sont extraites.',
    visual: (
      <div className={styles.stepRows}>
        <span className={styles.stepRow}><i className={styles.dotUrgent} />Devis à valider<em>Urgent</em></span>
        <span className={styles.stepRow}><i className={styles.dotImportant} />Facture n° 2291<em>Important</em></span>
        <span className={styles.stepRow}><i className={styles.dotNormal} />Newsletter<em>Normal</em></span>
      </div>
    ),
  },
  {
    number: '3',
    title: 'Vous décidez',
    desc: 'Vous validez, modifiez ou ignorez chaque suggestion. Rien n’est envoyé sans votre accord.',
    visual: (
      <div className={styles.stepDraft}>
        <p className={styles.stepDraftText}>Bonjour Marine, le devis est validé de mon côté…</p>
        <span className={styles.stepDraftRow}>
          <span className={styles.stepTone}>Professionnel</span>
          <span className={styles.stepSend}>Envoyer</span>
        </span>
      </div>
    ),
  },
]

const FAQ = [
  { q: <>Est-ce que <Brand /> lit vraiment mes emails ?</>, a: 'Oui, c’est nécessaire pour l’analyse et la classification. Vos données ne sont jamais partagées ni utilisées à d’autres fins.' },
  { q: 'Les réponses sont-elles envoyées automatiquement ?', a: <>Non, jamais. <Brand /> rédige des brouillons que vous devez relire et valider vous-même avant tout envoi.</> },
  { q: 'Est-ce gratuit ?', a: 'Oui. La création de compte et l’utilisation de base sont gratuites.' },
  { q: <><Brand /> est-il un produit récent ?</>, a: <>Oui, <Brand /> vient d’être lancé. Vous faites partie des premiers utilisateurs à le tester.</> },
]

export default function LandingPage() {
  // « mkc » ne peint rien : il pose les tokens --mk-*, dont --mk-max et
  // --mk-gutter, qui règlent désormais le cadre de la landing comme celui des
  // pages vitrine. Les couleurs de la landing restent les siennes.
  return (
    <div className={`mkc ${styles.page}`}>
      <ScrollProgress />
      <Navbar />

      {/* Hero : panneau sombre arrondi, contenu centré. Le panneau est
          INSÉRÉ et non pleine largeur — la barre de navigation reste posée
          sur le fond clair et n'a donc pas à inverser son encre.

          Aucun Reveal ici : la séquence d'ouverture est en CSS pur (voir
          .heroContent dans page.module.css). Un IntersectionObserver sur du
          contenu déjà visible au chargement n'apporte rien et retarde le
          premier rendu utile. */}
      <div className={styles.heroShell}>
      <section className={styles.heroSection}>
        <HeroAmbience />
        <div className={styles.hero}>
            <div className={styles.heroContent}>
              <p className={styles.badge}>
                Jusqu’à {HOURS_GIVEN_BACK} h par semaine rendues sur {BASELINE_EMAIL_HOURS} h d’emails — estimation
              </p>
              <h1 className={styles.heroTitle}>
                Planifiez. Simplifiez.<br />
                {/* Le dernier mot tourne, et les nappes du fond changent avec
                    lui — tout en CSS, voir HeroWord et HeroAmbience. */}
                <HeroWord />
              </h1>
              <p className={styles.heroDesc}>
                <Brand /> trie vos emails, en tire les tâches et repère les rendez-vous.
                Vous arrivez le matin sur des décisions, pas sur une pile.
              </p>
              <div className={styles.heroCtas}>
                <Link href="/auth/register" className={styles.heroCta}>Commencer gratuitement</Link>
                <a href="#how" className={styles.heroCtaGhost}>
                  Voir comment ça marche
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                </a>
              </div>
              {/* Vérifié dans lib/plans.tsx : le forfait gratuit n'a pas de
                  durée, et aucune route Stripe n'existe — rien à payer pour
                  commencer. Ne rien écrire ici qui ne soit vérifiable. */}
              <p className={styles.heroReassure}>Gratuit, sans limite de durée.</p>
              <ProviderMarks />
            </div>
        </div>

        {/* Plus de Reveal ici : l'entrée du visuel fait partie de la séquence
            d'ouverture du hero, jouée en CSS pur (voir .heroVisual). Un
            IntersectionObserver sur un élément déjà visible au chargement
            ajoute un aller-retour d'hydratation pour rien. */}
        <div className={styles.heroVisual}>
          <ProductPreview />
        </div>
      </section>
      </div>

      {/* Les trois photos de banque d'images ont été retirées : génériques,
          interchangeables d'un SaaS à l'autre, et trois requêtes vers
          unsplash.com au milieu du chargement. Leur texte, lui, a été
          conservé — réparti dans les étapes et la section Sécurité. */}
      <Reveal variant="up">
        <section id="how" className={styles.howSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Trois étapes, aucune configuration</h2>
            <p className={styles.sectionDesc}>
              <Brand /> réunit vos emails, votre agenda et vos priorités dans un seul espace.
              La mise en route tient en une autorisation Google.
            </p>
          </div>
          {/* Les <li> sont des enfants DIRECTS du <ol>. Chaque carte était
              enveloppée dans un Reveal, qui insère un <div> : la liste
              n'était donc plus une liste pour un lecteur d'écran, et
              Lighthouse le signalait sur deux règles. La cascade d'entrée
              est reprise en CSS, sur les :nth-child. */}
          <ol className={styles.stepsGrid}>
            {STEPS.map(s => (
              <li key={s.number} className={styles.stepCard}>
                <span className={styles.stepNumber}>{s.number}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
                <div className={styles.stepVisual} aria-hidden="true">{s.visual}</div>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* Section cible des entrées du menu "Solutions" : aucune page par
          métier n'existe, et créer cinq pages vides aurait produit cinq
          liens morts. */}
      <Reveal variant="up">
        <section id="solutions" className={styles.solutions}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Conçu pour ceux qui travaillent seuls</h2>
            <p className={styles.sectionDesc}>
              Sans assistant pour filtrer vos emails, chaque message vous revient. <Brand /> fait
              ce premier tri à votre place, quel que soit votre métier.
            </p>
          </div>
          <div className={styles.solutionsGrid}>
            {SOLUTIONS.map((s, i) => (
              <Reveal key={s.title} variant="up" delay={i * 70}>
                <div className={styles.solutionCard}>
                  <span className={styles.solutionIcon}>{s.icon}</span>
                  <h3 className={styles.solutionTitle}>{s.title}</h3>
                  <p className={styles.solutionDesc}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="up">
        <section id="features" className={styles.features}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Tout ce dont vous avez besoin</h2>
            <p className={styles.sectionDesc}>
              Une plateforme complète pour reprendre le contrôle de vos communications professionnelles.
            </p>
          </div>
          <div className={styles.bentoGrid}>
            {/* Tuile principale — tri intelligent, avec un vrai mini-aperçu
                de la boîte de réception plutôt qu'une icône abstraite. */}
            <Reveal variant="scale" delay={0} className={`${styles.bentoTile} ${styles.bentoBig}`}>
              <div className={styles.bentoText}>
                <span className={styles.featureNumber}>01</span>
                <h3 className={styles.bentoTitle}>
                  Tri intelligent
                </h3>
                <p className={styles.bentoDesc}>
                  Chaque email est analysé et classé automatiquement selon son urgence. Urgent, important ou normal — vous savez immédiatement sur quoi vous concentrer.
                </p>
              </div>
              <div className={styles.mockInbox} aria-hidden="true">
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>ML</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Marine Lecomte</p>
                    <p className={styles.mockPreview}>Pouvez-vous valider le devis avant vendredi ?</p>
                  </div>
                  <PriorityBadge priority="urgent" size="sm" />
                </div>
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>TB</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Thomas Bernard</p>
                    <p className={styles.mockPreview}>Réunion déplacée à 15h, salle B.</p>
                  </div>
                  <PriorityBadge priority="important" size="sm" />
                </div>
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>CN</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Camille Noël</p>
                    <p className={styles.mockPreview}>Merci pour votre retour rapide.</p>
                  </div>
                  <PriorityBadge priority="normal" size="sm" />
                </div>
              </div>
            </Reveal>

            {/* Tuile moyenne — réponses IA, avec un mini-aperçu du brouillon généré */}
            <Reveal variant="scale" delay={80} className={`${styles.bentoTile} ${styles.bentoMed}`}>
              <span className={styles.featureNumber}>02</span>
              <h3 className={styles.bentoTitle}>Réponses générées par l’IA</h3>
              <p className={styles.bentoDesc}>
                Des brouillons adaptés au contexte et au ton de l’expéditeur. Vous relisez, vous ajustez, vous envoyez.
              </p>
              <div className={styles.mockReply} aria-hidden="true">
                <p className={styles.mockQuoted}>« Pouvez-vous valider le devis avant vendredi ? »</p>
                <p className={styles.mockReplyText}>Bonjour Marine, le devis est validé de mon côté. Je vous transmets la version signée d’ici vendredi.</p>
                <span className={styles.mockReadyChip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Prêt à envoyer
                </span>
              </div>
            </Reveal>

            {/* Tuile moyenne — synchronisation Google Calendar (Pro) */}
            <Reveal variant="scale" delay={160} className={`${styles.bentoTile} ${styles.bentoMed} ${styles.bentoPremium}`}>
              <span className={styles.featureProBadge}>Pro</span>
              <span className={styles.featureNumber}>05</span>
              <h3 className={styles.bentoTitle}>Google Calendar, dans les deux sens</h3>
              <p className={styles.bentoDesc}>
                {/* « toujours à jour » et « chaque changement se synchronise
                    automatiquement » promettaient une synchronisation continue.
                    La réalité du code : un événement créé dans Sveltly part
                    vers Google immédiatement (lib/google-calendar-sync.ts),
                    mais l'autre sens est un IMPORT déclenché à l'ouverture de
                    la page Agenda (voir app/(app)/calendar/page.tsx). Un
                    rendez-vous ajouté dans Google n'apparaît donc pas tant
                    qu'on n'a pas ouvert l'agenda. */}
                Ce que vous créez ici part dans Google aussitôt. Ce que vous changez là-bas est
                importé à l’ouverture de votre agenda. Rien à recopier.
              </p>
              <div className={styles.mockSync} aria-hidden="true">
                <span className={styles.mockSyncChip}><Brand /></span>
                <span className={styles.mockSyncIcon}><IconSync /></span>
                <span className={styles.mockSyncChip}>Google Calendar</span>
              </div>
            </Reveal>

            {SMALL_FEATURES.map((f, i) => (
              <Reveal key={f.title} variant="scale" delay={240 + i * 80} className={`${styles.bentoTile} ${styles.bentoSmall}`}>
                <div className={styles.featureIconWrap}>{f.icon}</div>
                <span className={styles.featureNumber}>{f.number}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
                {/* Ces quatre tuiles n'avaient qu'une icone et du texte, a
                    cote de trois voisines portant un apercu d’interface :
                    elles se lisaient comme des cartes inachevees. Chaque
                    vignette montre le MECANISME decrit juste au-dessus. */}
                {f.vignette}
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Seule section sombre du site, et c'est délibéré : une rupture unique
          marque un changement de registre ; répétée, elle devient un motif.
          ⌘K est le SEUL raccourci réellement implémenté (voir
          components/layout/Header.tsx) — on n'en affiche aucun autre. Une
          touche décorative promet une vitesse que le produit n'a pas, et
          c'est la première chose qu'un visiteur essaie. */}
      <Reveal variant="up">
        <section className={styles.speed}>
          <div className={styles.speedInner}>
            <div className={styles.speedText}>
              <h2 className={styles.speedTitle}>Une touche, et vous êtes dedans.</h2>
              <p className={styles.speedDesc}>
                La palette de recherche ouvre tout : un email, une tâche, un rendez-vous, une page.
                Elle cherche dans les données déjà chargées — pas d’attente réseau, pas de rechargement.
              </p>
              <ul className={styles.speedList}>
                <li>Emails, tâches et agenda dans un même résultat</li>
                <li>Navigation au clavier, entrée pour ouvrir</li>
                <li>Depuis n’importe quel écran de l’application</li>
              </ul>
            </div>

            {/* Deux touches ⌘K flottaient ici, seules, dans une moitié de
                section vide. Elles nommaient le raccourci sans rien montrer
                de ce qu'il ouvre. La palette en marche, elle, démontre la
                phrase d'à côté : trois natures de résultats, arrivées sans
                attente. Le ⌘K n'a pas disparu — il est passé DANS le champ,
                là où il se trouve réellement dans l'application. */}
            <SearchPaletteMock />
          </div>

          <p className={styles.speedFoot}>
            <span className={styles.speedFigure}>~{HOURS_GIVEN_BACK} h</span>
            par semaine, estimées, sur {BASELINE_EMAIL_HOURS} h passées dans les emails.
            Le détail du calcul est dans le simulateur ci-dessous.
          </p>
        </section>
      </Reveal>

      <Reveal variant="scale">
        <ImpactCalculator />
      </Reveal>

      <Reveal variant="up">
        <section id="securite" className={styles.securityGridSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Vos emails sont sensibles. Nous les traitons comme tels.</h2>
            {/* La version précédente annonçait un « chiffrement de bout en
                bout » que le produit n'implémente pas — les emails doivent
                être lisibles côté serveur pour être analysés. Ne restent que
                des affirmations vérifiables dans le dépôt. */}
            <p className={styles.sectionDesc}>
              Chaque point ci-dessous correspond à quelque chose d’implémenté, pas à une intention.
              Ni certification affichée, ni promesse que le code ne tient pas.
            </p>
          </div>
          <div className={styles.securityGrid}>
            {SECURITY_POINTS.map((p, i) => (
              <Reveal key={p.title} variant="up" delay={i * 60}>
                <div className={styles.securityCard}>
                  <span className={styles.securityIcon}>{p.icon}</span>
                  <h3 className={styles.securityTitle}>{p.title}</h3>
                  <p className={styles.securityDesc}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className={styles.securityNote}>
            Le détail complet — données collectées, durées de conservation, sous-traitants — est dans la{' '}
            <Link href="/legal/privacy" className={styles.securityNoteLink}>politique de confidentialité</Link>.
          </p>
        </section>
      </Reveal>

      <Reveal variant="up">
        <PricingSection />
      </Reveal>

      <Reveal variant="blur">
        <section id="faq" className={styles.faqSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
          </div>
          {/* <details> natif : ouverture au clavier, lisible sans JavaScript,
              et trouvable par la recherche du navigateur même replié sur les
              moteurs récents. Un accordéon fait à la main perd les trois. */}
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <details key={i} className={styles.faqItem} open={i === 0}>
                <summary className={styles.faqQuestion}>
                  {/* Le libellé est enveloppé : certaines questions contiennent
                      <Brand />, donc plusieurs nœuds. Posés directement dans un
                      flex en space-between, ils s'écartaient aux quatre coins
                      de la ligne. */}
                  <span>{item.q}</span>
                  <span className={styles.faqSign} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className={styles.faqAnswer}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="scale" className={styles.ctaShell}>
        <section className={styles.ctaBanner}>
          <h2 className={styles.ctaBannerTitle}>Demain matin, votre boîte<br />aura déjà été triée.</h2>
          <p className={styles.ctaBannerDesc}>
            <Brand /> vient d’être lancé — vous faites partie des premiers à l’essayer.
          </p>
          <Link href="/auth/register" className={styles.ctaBannerBtn}>
            Créer un compte gratuitement
          </Link>
          <p className={styles.ctaBannerNote}>Gratuit, sans limite de durée.</p>
        </section>
      </Reveal>

      {/* Même pied de page que les pages marketing, alimenté par
          lib/navigation.ts — l'ancien pied de la landing listait six ancres
          internes qui ne menaient nulle part ailleurs que sur cette page. */}
      <SiteFooter />
    </div>
  )
}
