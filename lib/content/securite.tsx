import Link from 'next/link'
import type { DemoContent } from '@/components/marketing/templates/DemoPage'
import type { EditorialContent } from '@/components/marketing/templates/EditorialPage'
import type { StoryContent } from '@/components/marketing/templates/StoryPage'
import SecurityFlowVisual from '@/components/marketing/visuals/SecurityFlowVisual'
import { SummaryVisual } from '@/components/marketing/visuals/ProductVisuals'
import { SpotSecurity, SpotFlow } from '@/components/marketing/visuals/Spots'

// Pages /securite/*. Règle absolue de ce fichier : chaque affirmation
// correspond à un mécanisme présent dans le dépôt, référence en commentaire.
//
// N'y figurent nulle part, et c'est délibéré : certifications (SOC 2,
// ISO 27001), « chiffrement de bout en bout » — impossible ici, les messages
// doivent être lisibles côté serveur pour être analysés — et « aucun mot de
// passe stocké », faux puisque l'application propose aussi une inscription par
// email et mot de passe via Supabase Auth.

const CRUMB = { label: 'Sécurité', href: '/securite' }

// --- Données Gmail — gabarit démonstration -----------------------------------
// app/api/mailboxes/connect (OAuth) ; politique Limited Use citée dans
// components/legal/PrivacyContent.tsx.
export const donneesGmail: DemoContent = {
  family: 'securite',
  breadcrumb: [CRUMB, { label: 'Vos données Gmail', href: '/securite/donnees-gmail' }],
  title: 'Oui, Sveltly lit vos emails. Voici jusqu’où.',
  lede: 'Pour classer un message et le résumer, il faut le lire. Autant le dire franchement, puis détailler ce que ça implique — et ce que ça n’implique pas.',
  demo: { visual: <SecurityFlowVisual /> },
  headerSpot: <SpotFlow size={190} />,
  annotations: [
    { n: 1, title: 'Vous autorisez depuis Google', body: 'L’écran d’autorisation est celui de Google, pas le nôtre. Votre mot de passe Gmail ne transite jamais par Sveltly.' },
    { n: 2, title: 'Le message est analysé', body: 'Objet, expéditeur et corps servent à produire la priorité, le résumé et le brouillon. C’est le fonctionnement du produit.' },
    { n: 3, title: 'Vous reprenez la main', body: 'Depuis vos réglages Sveltly, ou depuis la page des applications connectées de votre compte Google. L’accès cesse aussitôt.' },
  ],
  sections: [
    {
      heading: 'Ce que vos emails ne servent jamais à faire',
      body: (
        <>
          <p>
            Ils ne sont pas revendus. Ils ne sont pas cédés à des fins publicitaires. Ils ne servent pas à
            entraîner un modèle, ni chez nous ni ailleurs.
          </p>
          <p>
            L’usage des données Gmail respecte les exigences <strong>Limited Use</strong> de Google, qui
            encadrent précisément ce qu’une application tierce a le droit de faire de votre boîte.
          </p>
        </>
      ),
    },
    {
      heading: 'Le point qu’on ne peut pas contourner',
      body: (
        <p>
          Le contenu nécessaire à l’analyse est transmis au fournisseur du modèle qui produit le classement
          et les brouillons. C’est indissociable du fonctionnement : il n’existe pas de version de Sveltly
          qui trierait vos emails sans les lire. Le détail des sous-traitants figure dans la politique de
          confidentialité.
        </p>
      ),
      note: 'Si ce point est rédhibitoire pour vous, c’est une raison légitime de ne pas utiliser Sveltly. Mieux vaut le savoir avant de connecter sa boîte.',
    },
    {
      heading: 'Un humain peut-il lire vos messages ?',
      body: (
        <p>
          Le traitement est automatisé. Un accès technique à la base reste possible pour l’exploitation du
          service, comme chez tout hébergeur de données — c’est précisément pour ça que le cloisonnement par
          compte et le chiffrement des jetons existent. Nous préférons décrire ces garde-fous plutôt que de
          promettre que personne, jamais, ne pourrait accéder à quoi que ce soit.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Que se passe-t-il si je révoque l’accès ?', a: 'La synchronisation s’arrête. Les messages déjà analysés restent affichés jusqu’à expiration du cache, et la suppression du compte efface les données associées.' },
    { q: 'Sveltly peut-il envoyer un email sans moi ?', a: 'Non. L’envoi demande votre clic à chaque fois, et aucun réglage ne permet de l’automatiser.' },
    { q: 'Mes emails sont-ils supprimés de Gmail ?', a: 'Jamais. L’archivage automatique, si vous l’activez, sort un message de la boîte de réception — il reste dans votre compte Gmail.' },
  ],
  related: ['/securite/protection-des-donnees', '/securite/controle-de-vos-donnees', '/legal/privacy'],
  cta: {
    title: 'Lisez la politique avant de connecter',
    body: 'Tout est écrit : données collectées, durées de conservation, sous-traitants. C’est le document qui fait foi.',
    label: 'Lire la politique de confidentialité',
  },
}

// --- Protection des données — gabarit éditorial ------------------------------
// supabase-schema.sql : RLS activé sur les 8 tables avec politique par
// utilisateur. lib/token-crypto.ts : AES-256-GCM, clé serveur uniquement.
export const protectionDesDonnees: EditorialContent = {
  family: 'securite',
  breadcrumb: [CRUMB, { label: 'Protection des données', href: '/securite/protection-des-donnees' }],
  title: 'Trois mécanismes, pas trois promesses',
  lede: 'Une page sécurité se juge à ce qu’elle décrit précisément, pas à la quantité de rassurant qu’elle aligne.',
  headerSpot: <SpotSecurity size={190} />,
  standfirst: (
    <>
      Dans une application à plusieurs utilisateurs, le vrai risque n’est pas l’attaque spectaculaire.
      C’est une requête mal écrite qui renvoie les données d’un autre compte.
    </>
  ),
  blocks: [
    {
      heading: 'La base décide, pas le code applicatif',
      body: (
        <>
          <p>
            Une protection qui repose sur le code finit toujours par céder quelque part : une condition
            oubliée, un filtre mal placé, une nouvelle requête écrite un soir de fatigue.
          </p>
          <p>
            Le cloisonnement est donc appliqué par la base elle-même, via le <strong>Row Level Security</strong> de
            PostgreSQL. Il est actif sur toutes les tables qui contiennent vos données : profils, boîtes
            mail, emails, événements, tâches, contacts, comptes d’agenda, historique de réponses. Même une
            requête incorrecte côté application ne peut pas retourner les lignes d’un autre utilisateur :
            l’autorisation est évaluée en dessous.
          </p>
        </>
      ),
      figure: { value: '8', caption: 'tables protégées par une politique par utilisateur' },
    },
    {
      heading: 'Les jetons Google sont chiffrés au repos',
      body: (
        <p>
          Le jeton d’accès qui permet de lire votre boîte est chiffré en <strong>AES-256-GCM</strong> avant
          d’être stocké, avec une clé qui ne quitte jamais le serveur et n’est jamais exposée au navigateur.
          Les opérations qui demandent des droits élevés passent par des routes serveur dédiées, jamais
          depuis votre navigateur.
        </p>
      ),
      aside: 'C’est le point sensible : un jeton en clair dans une base compromise donnerait accès à une boîte mail entière.',
    },
    {
      heading: 'Et l’authentification',
      body: (
        <p>
          Deux chemins : Google OAuth, ou email et mot de passe gérés par Supabase Auth — où les mots de
          passe sont stockés sous forme de condensats, jamais en clair. Les communications entre votre
          navigateur et nos serveurs passent par HTTPS/TLS.
        </p>
      ),
    },
    {
      heading: 'Ce que nous n’avons pas',
      body: (
        <>
          <p>
            Pas de certification SOC 2. Pas d’ISO 27001. Sveltly est un produit récent, et afficher un label
            qu’on ne détient pas serait exactement le genre de détail qui décrédibilise tout le reste de la
            page.
          </p>
          <p>
            Pas de chiffrement de bout en bout non plus, et ce n’est pas un oubli : pour trier et résumer un
            message, le serveur doit pouvoir le lire. Un chiffrement de bout en bout rendrait le produit
            impossible. Beaucoup d’outils emploient pourtant le terme — nous préférons ne pas.
          </p>
        </>
      ),
    },
  ],
  pullQuote: 'Une page sécurité qui n’avoue rien n’a généralement rien vérifié.',
  faq: [
    { q: 'Où sont hébergées les données ?', a: <>Chez Supabase pour la base, chez Vercel pour l’application. Les régions et les sous-traitants sont précisés dans la <Link href="/legal/privacy">politique de confidentialité</Link>.</> },
    { q: 'Êtes-vous conformes au RGPD ?', a: 'Les traitements, finalités et durées de conservation sont décrits dans la politique de confidentialité. C’est ce document qui fait foi, pas cette page.' },
    { q: 'Faites-vous auditer votre sécurité ?', a: 'Pas à ce jour. Le cas échéant, ce serait écrit ici avec la date et le nom de l’auditeur.' },
  ],
  related: ['/securite/donnees-gmail', '/securite/controle-de-vos-donnees', '/legal/privacy'],
  cta: {
    title: 'Le détail complet est dans la politique',
    body: 'Durées de conservation, sous-traitants, droits : tout y est écrit noir sur blanc.',
    label: 'Lire la politique de confidentialité',
  },
}

// --- Contrôle de vos données — gabarit récit ---------------------------------
// app/api/account/delete/route.ts : suppression réelle, vérifiée.
export const controleDeVosDonnees: StoryContent = {
  family: 'securite',
  breadcrumb: [CRUMB, { label: 'Garder le contrôle', href: '/securite/controle-de-vos-donnees' }],
  title: 'Partir doit prendre moins de temps qu’arriver',
  lede: 'Beaucoup de services rendent l’inscription immédiate et la suppression introuvable : un formulaire, un délai, un email au support. Une donnée qu’on ne peut pas retirer n’est pas vraiment la vôtre.',
  hero: { scene: <SummaryVisual /> },
  chapters: [
    {
      marker: '01',
      heading: 'Déconnecter une boîte',
      body: (
        <p>
          Chaque boîte Gmail connectée se retire séparément, depuis vos réglages. La synchronisation
          s’arrête pour cette adresse, les autres continuent. Utile quand une mission se termine et que
          l’adresse qui allait avec n’a plus lieu d’être là.
        </p>
      ),
    },
    {
      marker: '02',
      heading: 'Ou couper depuis Google',
      body: (
        <p>
          Vous n’êtes pas obligé de passer par nous. La page des applications connectées de votre compte
          Google permet de révoquer l’accès directement. C’est le même résultat, et ça ne demande pas notre
          coopération — ce qui est précisément l’intérêt.
        </p>
      ),
      flip: true,
    },
    {
      marker: '03',
      heading: 'Supprimer le compte',
      body: (
        <>
          <p>
            Un bouton dans vos réglages. Le compte d’authentification est supprimé, et avec lui les données
            rattachées en base ainsi que votre photo de profil. Sans délai de réflexion imposé, sans email à
            envoyer au support.
          </p>
          <p>
            <strong>C’est définitif.</strong> Les données associées ne sont pas récupérables ensuite — c’est
            le principe même d’une suppression.
          </p>
        </>
      ),
    },
    {
      heading: 'Vos emails, eux, ne bougent pas',
      body: (
        <p>
          Sveltly ne supprime jamais un message dans Gmail. L’archivage automatique, si vous l’activez, sort
          un email de la boîte de réception — il reste dans votre compte Google, retrouvable par recherche.
          Quitter Sveltly ne vous fait perdre aucun courrier.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Puis-je exporter mes données avant de partir ?', a: 'Oui, depuis Réglages → Sécurité → Vos données, en un bouton. Vous récupérez un fichier JSON contenant votre profil, vos boîtes connectées, vos tâches, vos événements, vos contacts, vos réponses envoyées et toutes les analyses faites sur vos emails — résumés, points clés, brouillons. Aucune demande à faire, aucun délai : c’est immédiat.' },
    { q: 'La suppression est-elle immédiate ?', a: 'Oui. Il n’y a ni période de grâce ni délai de rétractation côté application.' },
    { q: 'Que deviennent mes jetons Google ?', a: 'Ils sont supprimés avec le compte. Vous pouvez aussi révoquer l’accès depuis Google au préalable, les deux chemins mènent au même endroit.' },
  ],
  related: ['/securite/donnees-gmail', '/securite/protection-des-donnees', '/contact'],
  cta: {
    title: 'Essayez, et partez quand vous voulez',
    body: 'La porte de sortie est dans les réglages, au même endroit que le reste. Vous pouvez vérifier avant de connecter quoi que ce soit.',
  },
}
