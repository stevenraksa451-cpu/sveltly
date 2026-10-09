import type { DayContent } from '@/components/marketing/templates/DayPage'
import type { BeforeAfterContent } from '@/components/marketing/templates/BeforeAfterPage'
import type { StoryContent } from '@/components/marketing/templates/StoryPage'
import type { DemoContent } from '@/components/marketing/templates/DemoPage'
import { InboxBefore, InboxAfter } from '@/components/marketing/visuals/InboxStates'
import { SummaryVisual, TasksVisual, AgendaVisual, ReplyVisual } from '@/components/marketing/visuals/ProductVisuals'
import { SpotFocus, SpotSummary, SpotAgenda, SpotTasks } from '@/components/marketing/visuals/Spots'

// Pages /solutions/*. Chacune décrit un quotidien, puis ce que le produit y
// change. Aucun chiffre de performance, aucun témoignage : il n'y a pas
// d'utilisateurs à citer, et en inventer serait le plus court chemin vers un
// site qu'on ne croit plus.

const CRUMB = { label: 'Solutions', href: '/solutions' }

// --- Développeurs — gabarit journée type -------------------------------------
export const developpeurs: DayContent = {
  family: 'solutions',
  breadcrumb: [CRUMB, { label: 'Développeurs', href: '/solutions/developpeurs' }],
  title: 'Une interruption coûte plus cher que l’interruption',
  lede: 'Le problème n’est pas le nombre d’emails. C’est de devoir tous les ouvrir pour savoir si l’un d’eux méritait de vous sortir de votre éditeur.',
  visual: <TasksVisual />,
  spot: <SpotFocus size={250} />,
  moments: [
    {
      time: '09:00',
      heading: 'Un coup d’œil, une minute',
      body: <p>Zéro urgent. Vous fermez l’onglet et vous attaquez la fonctionnalité de la semaine. Pas de notification à surveiller : vous saurez si quelque chose arrive, parce que ce qui arrive sera classé.</p>,
    },
    {
      time: '09:15 — 11:30',
      heading: 'Rien. Et c’est le but.',
      quiet: true,
      body: <p>Deux heures sans ouvrir la boîte. Sept messages sont arrivés pendant ce temps : une newsletter technique, trois alertes de supervision résolues toutes seules, deux questions de planning, une facture. Aucun ne justifiait de vous couper.</p>,
    },
    {
      time: '11:30',
      heading: 'Pause, et là un urgent',
      body: (
        <>
          <p>
            Un client ne peut plus accéder à son espace. Le résumé donne le contexte en une ligne : depuis
            quand, et qui l’a signalé.
          </p>
          <p>
            Vous répondez depuis le brouillon proposé, en remplaçant le délai annoncé par le vrai. Quatre
            minutes.
          </p>
        </>
      ),
    },
    {
      time: '14:00',
      heading: 'Une relecture demandée devient une tâche',
      body: <p>« Peux-tu jeter un œil à la branche avant jeudi ? » n’est plus un email qui descend dans la liste. C’est une ligne datée au jeudi, que vous retrouverez même si vous ne rouvrez pas la conversation.</p>,
    },
    {
      time: '17:45',
      heading: 'Les onze autres, d’un bloc',
      body: <p>Vous traitez le reste en une fois. Aucun ne vous a coupé dans la journée, et aucun n’est passé à la trappe.</p>,
    },
  ],
  takeaways: [
    {
      heading: 'Les alertes automatiques ne deviennent pas des tâches',
      body: <p>Un code de vérification, un lien de réinitialisation, une alerte déjà résolue : ces messages sont classés comme notifications et ne produisent aucune ligne à cocher. Une to-do pleine de choses obsolètes ne se lit plus.</p>,
    },
    {
      heading: 'Plusieurs adresses, une seule liste',
      body: <p>L’adresse de l’agence, celle du client direct, celle du side project. Triées ensemble, doublons écartés. Une boîte sur le forfait gratuit, autant que nécessaire sur le Pro.</p>,
    },
  ],
  faq: [
    { q: 'Sveltly envoie-t-il des notifications ?', a: 'Il ne vous pousse rien pendant que vous travaillez. Le classement est là quand vous ouvrez la boîte — c’est vous qui décidez du moment.' },
    { q: 'Et les alertes de production ?', a: 'Une panne en cours ou un incident de sécurité sont des signaux concrets : ces messages sont classés urgents. Une alerte qui se résout seule, non.' },
  ],
  related: ['/produit/tri-intelligent', '/produit/taches', '/tarifs'],
  cta: {
    title: 'Deux heures sans ouvrir la boîte',
    body: 'Connectez Gmail et essayez une matinée sans vérifier. Vous verrez à la pause si quelque chose vous attendait.',
  },
}

// --- Designers — gabarit avant/après -----------------------------------------
export const designers: BeforeAfterContent = {
  family: 'solutions',
  breadcrumb: [CRUMB, { label: 'Designers', href: '/solutions/designers' }],
  title: 'Un email, six demandes, un paragraphe',
  lede: 'Les retours arrivent en bloc : une couleur, un texte, une question de planning, une validation. Tout mélangé, et il faut relire trois fois pour être sûr de n’avoir rien oublié.',
  spot: <SpotSummary size={240} />,
  toggle: {
    beforeLabel: 'Le message reçu',
    afterLabel: 'Ce que vous voyez',
    before: <InboxBefore />,
    after: <InboxAfter />,
    beforeCaption: 'Sept messages par heure d’arrivée. Le retour client est quelque part là-dedans, avec la newsletter et la promo.',
    afterCaption: 'Le retour remonte, les demandes qu’il contient sont listées séparément, et les corrections sont devenues des tâches.',
  },
  sections: [
    {
      heading: 'Chaque demande, sur sa ligne',
      body: (
        <>
          <p>
            Quand un message liste plusieurs éléments concrets, ils apparaissent séparément — deux à quatre
            points, courts. Vous voyez d’un coup s’il y a trois corrections ou six.
          </p>
          <p>
            Celles qui demandent une action deviennent des tâches, avec la date de livraison attendue quand
            elle est mentionnée. <strong>Vous ne recopiez rien.</strong>
          </p>
        </>
      ),
    },
    {
      heading: 'Le ton se retient par client',
      body: (
        <p>
          Le client qui vous tutoie depuis deux ans et celui qui signe « Cordialement, Direction » ne
          reçoivent pas la même réponse. Un ton mémorisé pour un contact s’applique à tous ses messages,
          indépendamment de votre réglage général.
        </p>
      ),
    },
    {
      heading: 'Ce qui reste à votre charge',
      body: (
        <p>
          Les pièces jointes ne sont pas analysées. Un PDF annoté, une capture avec des flèches rouges, un
          fichier Figma exporté : ils sont listés et téléchargeables, mais leur contenu reste à ouvrir. Le
          résumé porte sur le corps du message, pas sur ce qui l’accompagne.
        </p>
      ),
    },
  ],
  details: [
    { term: 'Points clés', description: 'Deux à quatre éléments extraits quand le message en contient plusieurs. Sinon, rien — une liste à un point ne sert personne.' },
    { term: 'Validations repérées', description: 'Une approbation attendue avec une échéance devient une tâche datée, pas un email qui descend.' },
    { term: 'Accusé de réception', description: 'Un brouillon de confirmation est prêt. Répondre « bien reçu, je regarde ça » prend un clic.' },
  ],
  faq: [
    { q: 'Les captures et PDF sont-ils lus ?', a: 'Non. Les pièces jointes sont listées et téléchargeables ; leur contenu n’est pas analysé.' },
    { q: 'Puis-je corriger une demande mal comprise ?', a: 'Oui. Les tâches créées sont modifiables et supprimables comme les autres, et le message d’origine reste affiché intégralement.' },
  ],
  related: ['/produit/resume-du-jour', '/produit/taches', '/produit/reponses-ia'],
  cta: {
    title: 'Prenez le dernier retour client reçu',
    body: 'Connectez Gmail et ouvrez-le. Comptez les demandes qu’il contient, puis comparez.',
  },
}

// --- Consultants — gabarit récit ---------------------------------------------
export const consultants: StoryContent = {
  family: 'solutions',
  breadcrumb: [CRUMB, { label: 'Consultants', href: '/solutions/consultants' }],
  title: 'La relance de trop est toujours celle qu’on n’a pas vue',
  lede: 'Un devis sans réponse pendant dix jours. Une facture noyée sous trente messages. Un client qui s’agace faute de retour. Ce sont rarement des oublis — c’est une boîte qui ne hiérarchise rien.',
  hero: { scene: <AgendaVisual /> },
  chapters: [
    {
      marker: '01',
      heading: 'Ce qui engage de l’argent remonte',
      body: (
        <>
          <p>
            Un paiement en retard avec pénalité annoncée. Un devis à valider avant une date. Un client qui
            évoque la fin de la mission. Ces signaux font monter un message, parce qu’ils ont un coût
            chiffrable si on les rate.
          </p>
          <p>
            Une relance polie sans échéance reste en « important ». Elle attendra la fin de journée, et ce
            n’est pas grave.
          </p>
        </>
      ),
      visual: <SummaryVisual />,
    },
    {
      marker: '02',
      heading: 'Les rendez-vous se posent pendant que vous êtes chez un client',
      body: (
        <p>
          Un prospect propose jeudi 10 h. Le créneau est libre, l’événement apparaît. Un second propose le
          même horaire : rien n’est créé par-dessus, une alternative vous attend. Vous arbitrez le soir, en
          trois secondes, au lieu de découvrir le conflit la veille.
        </p>
      ),
      flip: true,
      visual: <TasksVisual />,
    },
    {
      marker: '03',
      heading: 'Ce que vous promettez devient une ligne',
      body: (
        <p>
          « Je vous envoie ça en fin de semaine » écrit mardi dans un email se transforme en tâche datée au
          vendredi. C’est souvent là que ça se joue : pas dans ce qu’on oublie de faire, mais dans ce qu’on
          oublie d’avoir promis.
        </p>
      ),
    },
    {
      heading: 'Sveltly ne relance personne à votre place',
      body: (
        <p>
          Il prépare des brouillons, il n’envoie rien seul. Le suivi passe par les tâches, qui vous
          rappellent ce qui attend une réponse. Une relance automatique envoyée en votre nom à un client qui
          avait déjà répondu coûterait plus cher que les minutes gagnées.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Comment sont traitées les factures reçues ?', a: '« Important » quand un délai raisonnable est mentionné. « Urgent » en cas de retard avec pénalité, interruption de service ou mise en demeure annoncée.' },
    { q: 'Puis-je connecter l’adresse de chaque client ?', a: 'Une boîte Gmail sur le forfait gratuit, autant que vous voulez sur le Pro. Elles sont triées ensemble, et un message reçu en copie sur deux adresses n’apparaît qu’une fois.' },
  ],
  related: ['/produit/agenda', '/produit/taches', '/tarifs'],
  cta: {
    title: 'Voyez ce qui traîne depuis dix jours',
    body: 'Connectez Gmail. Les devis sans réponse et les factures en attente remontent d’eux-mêmes.',
  },
}

// --- Rédacteurs & traducteurs — gabarit démonstration ------------------------
export const redacteursTraducteurs: DemoContent = {
  family: 'solutions',
  breadcrumb: [CRUMB, { label: 'Rédacteurs & traducteurs', href: '/solutions/redacteurs-traducteurs' }],
  title: '« Pour la fin de semaine » ne veut pas dire la même chose pour tout le monde',
  lede: 'Les consignes arrivent rarement dans un document. Elles sont dans l’email, parfois réparties sur trois messages, et la date de rendu est formulée au jugé.',
  demo: { visual: <SummaryVisual /> },
  headerSpot: <SpotTasks size={190} />,
  annotations: [
    { n: 1, title: 'La commande', body: 'Volume, sujet, format : ce que le message demande vraiment, extrait du paragraphe où c’était enfoui.' },
    { n: 2, title: 'La date réelle', body: '« Avant vendredi » devient une date calendaire, calculée depuis le jour où le message est arrivé — pas depuis celui où vous l’ouvrez.' },
    { n: 3, title: 'Les consignes', body: 'Ton, longueur, contraintes : listées séparément quand le brief en contient plusieurs.' },
  ],
  sections: [
    {
      heading: 'Trois jours d’écart sur la même phrase',
      body: (
        <>
          <p>
            Un message reçu mardi disant « pour la fin de semaine » que vous lisez jeudi : la date de rendu
            n’a pas changé, votre perception si. Le calcul se fait depuis la réception, toujours.
          </p>
          <p>
            C’est un détail jusqu’au jour où ça ne l’est plus.
          </p>
        </>
      ),
    },
    {
      heading: 'Répondre dans la langue du client',
      body: (
        <p>
          Un brief en anglais est compris en anglais ; le résumé vous revient en français. La réponse, elle,
          part dans la langue que vous choisissez — français, anglais, ou celle du message reçu. Le réglage
          se fait une fois.
        </p>
      ),
      note: 'Le résumé et les points clés sont toujours rendus en français, quelle que soit la langue du message.',
    },
    {
      heading: 'Un brief sur trois messages',
      body: (
        <p>
          Chaque message est analysé pour lui-même. Un brief étalé sur trois emails produit trois résumés et,
          le cas échéant, trois tâches. Sveltly ne recoud pas une conversation : il vous évite de rouvrir
          chaque message pour savoir ce qu’il contenait.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Les emails en langue étrangère sont-ils bien compris ?', a: 'L’analyse se fait dans la langue d’origine. Le résumé et les points clés vous reviennent en français.' },
    { q: 'Le nombre de mots demandé est-il repris ?', a: 'S’il figure dans le message, il apparaît dans le résumé ou les points clés. S’il n’y figure pas, rien n’est inventé.' },
  ],
  related: ['/produit/taches', '/produit/reponses-ia', '/produit/resume-du-jour'],
  cta: {
    title: 'Prenez votre dernière commande reçue par email',
    body: 'Connectez Gmail et regardez quelle date Sveltly en tire.',
  },
}
