import type { BeforeAfterContent } from '@/components/marketing/templates/BeforeAfterPage'
import type { DemoContent } from '@/components/marketing/templates/DemoPage'
import type { DayContent } from '@/components/marketing/templates/DayPage'
import type { StoryContent } from '@/components/marketing/templates/StoryPage'
import { InboxBefore, InboxAfter } from '@/components/marketing/visuals/InboxStates'
import { SummaryVisual, TasksVisual, AgendaVisual, ReplyVisual } from '@/components/marketing/visuals/ProductVisuals'
import SortingVisual from '@/components/marketing/visuals/SortingVisual'
import { SpotSorting, SpotSummary, SpotTasks, SpotAgenda, SpotReply, SpotMailboxes } from '@/components/marketing/visuals/Spots'

// Contenu des pages /produit/*. Chaque affirmation renvoie à un comportement
// présent dans le dépôt ; la référence est en commentaire au-dessus de chaque
// page. Rien n'est promis au futur.

const CRUMB = { label: 'Produit', href: '/produit' }

// --- Tri intelligent — gabarit avant/après -----------------------------------
// app/api/analyze/route.ts : étape anti-promo prioritaire, puis priorité
// déduite de signaux concrets.
export const triIntelligent: BeforeAfterContent = {
  family: 'produit',
  breadcrumb: [CRUMB, { label: 'Tri intelligent', href: '/produit/tri-intelligent' }],
  title: 'Sept messages. Deux comptent vraiment.',
  lede: 'Votre boîte les classe par heure d’arrivée. Sveltly les classe par ce qu’ils vous coûtent si vous les ratez.',
  spot: <SpotSorting size={240} />,
  toggle: {
    beforeLabel: 'Sans Sveltly',
    afterLabel: 'Avec Sveltly',
    before: <InboxBefore />,
    after: <InboxAfter />,
    beforeCaption: 'Une panne de site et une pub pour du matériel occupent le même rang. Pour le savoir, il faut ouvrir les sept.',
    afterCaption: 'La panne et le devis remontent. Les quatre messages du bas attendront ce soir, et ça n’a aucune conséquence.',
  },
  sections: [
    {
      heading: 'Le mot « urgent » ne vaut rien',
      body: (
        <>
          <p>
            Une promotion avec un compte à rebours se présente toujours comme urgente. Une panne qui bloque
            vos clients, souvent pas. Trier sur le ton d’un message revient à faire confiance à celui qui
            crie le plus fort.
          </p>
          <p>
            Sveltly cherche autre chose : une date butoir réelle, un paiement en retard avec pénalité
            annoncée, une dépendance explicite — « je ne peux pas signer sans ton accord ». <strong>Un
            message qui n’a aucun de ces signaux ne monte pas</strong>, quels que soient les mots employés.
          </p>
        </>
      ),
    },
    {
      heading: 'Les pubs sont écartées en premier',
      body: (
        <p>
          Avant tout jugement sur le contenu, un message est examiné pour ce qu’il est : un lien de
          désabonnement, une adresse en no-reply, des paramètres de suivi dans les liens. S’il porte un de
          ces signes, il est classé normal et l’analyse s’arrête là. C’est ce qui empêche une vente flash
          d’atterrir au-dessus d’une facture.
        </p>
      ),
    },
    {
      heading: 'En cas de doute, ça redescend',
      body: (
        <p>
          Quand deux niveaux se valent, c’est le plus bas qui l’emporte. Un email sous-classé se rattrape en
          fin de journée. Une fausse alerte, elle, vous apprend à ignorer les alertes — et c’est beaucoup
          plus difficile à réparer.
        </p>
      ),
    },
  ],
  details: [
    { term: 'Trois niveaux', description: 'Urgent, important, normal. Assez pour décider, trop peu pour hésiter devant le classement lui-même.' },
    { term: 'Plusieurs boîtes', description: 'Vos adresses Gmail sont triées ensemble. Un message reçu en copie sur deux d’entre elles n’apparaît qu’une fois.' },
    { term: 'Rien n’est caché', description: 'Un email mal classé reste dans la liste, consultable et modifiable à la main. Le tri réordonne, il ne supprime jamais.' },
    { term: 'Toutes les langues', description: 'L’analyse se fait dans la langue du message. Le résumé vous revient en français.' },
  ],
  faq: [
    { q: 'Et si Sveltly se trompe sur un message important ?', a: 'Il reste dans votre boîte, à sa place dans la liste. Vous pouvez changer sa priorité à la main. Rien n’est déplacé hors de votre vue ni supprimé.' },
    { q: 'Mes newsletters sont-elles effacées ?', a: 'Non. Elles descendent dans la liste. Si vous activez l’archivage automatique, celles de plus de sept jours quittent la boîte de réception — elles restent dans Gmail.' },
    { q: 'Combien de temps avant le premier tri ?', a: 'Quelques minutes après la connexion de Gmail. Les messages récents passent en premier.' },
  ],
  related: ['/produit/resume-du-jour', '/produit/taches', '/securite/donnees-gmail'],
  cta: {
    title: 'Regardez ce que donne votre lundi matin',
    body: 'Connectez Gmail et laissez passer une matinée. Le classement se juge sur vos vrais messages, pas sur une démonstration.',
  },
}

// --- Résumé du jour — gabarit démonstration ----------------------------------
// Champ dailySummary, produit par app/api/analyze/route.ts.
export const resumeDuJour: DemoContent = {
  family: 'produit',
  breadcrumb: [CRUMB, { label: 'Résumé du jour', href: '/produit/resume-du-jour' }],
  title: 'Une phrase, et vous savez s’il faut ouvrir',
  lede: '« Suite à notre échange », « Petite question », « Point rapide ». Un objet d’email ne dit presque jamais ce que l’email demande.',
  demo: { visual: <SummaryVisual /> },
  headerSpot: <SpotSummary size={190} />,
  annotations: [
    { n: 1, title: 'Ce qui est demandé', body: 'Pas le thème du message : la demande. Un devis à signer, une date à confirmer, une somme à régler.' },
    { n: 2, title: 'Pour quand', body: '« Avant vendredi » devient une date réelle, calculée depuis le jour où le message est arrivé — pas depuis celui où vous le lisez.' },
    { n: 3, title: 'Et rien d’autre', body: 'Une seule phrase. Un résumé qui prend trois lignes ne fait pas gagner de temps, il déplace la lecture.' },
  ],
  sections: [
    {
      heading: 'Lire une liste au lieu d’ouvrir douze messages',
      body: (
        <>
          <p>
            En fin de journée, douze nouveaux messages. Vous lisez douze phrases à la suite, sans ouvrir un
            seul email. Neuf ne demandent rien. Trois méritent une réponse, et leurs brouillons sont déjà
            prêts.
          </p>
          <p>
            Le gain n’est pas dans la vitesse de lecture. Il est dans <strong>les neuf messages que vous
            n’avez pas ouverts</strong>.
          </p>
        </>
      ),
      note: 'Le message complet reste affiché juste à côté. Le résumé aide à décider quand lire, il ne remplace pas la lecture d’un email qui compte.',
    },
    {
      heading: 'Quand un message contient plusieurs demandes',
      body: (
        <p>
          Un retour client mélange souvent quatre choses dans un paragraphe : une correction, une question
          de planning, une validation, une remarque. Dans ce cas, les points sont listés séparément — deux à
          quatre, courts. C’est le moment où relire trois fois le même paragraphe devient inutile.
        </p>
      ),
    },
    {
      heading: 'Ce que le résumé ne fait pas',
      body: (
        <p>
          Il ne lit pas vos pièces jointes. Un PDF de devis est listé et téléchargeable, son contenu n’est
          pas analysé. Il n’invente rien non plus : une information absente du message n’apparaît pas dans
          le résumé, même si elle rendrait la phrase plus utile.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Le résumé peut-il se tromper ?', a: 'Oui, comme toute lecture automatique. C’est pour ça que l’email d’origine reste affiché intégralement à côté, et que le résumé ne masque jamais le contenu réel.' },
    { q: 'Dans quelle langue ?', a: 'Toujours en français, même pour un message reçu en anglais ou en espagnol.' },
  ],
  related: ['/produit/tri-intelligent', '/produit/reponses-ia', '/produit/taches'],
  cta: {
    title: 'Vos messages de demain matin, en une liste',
    body: 'Connectez Gmail ce soir. Demain, vous lirez une liste de phrases au lieu d’une liste d’objets.',
  },
}

// --- Réponses assistées — gabarit récit --------------------------------------
// lib/tone.ts (trois tons, surcharge par contact) + app/api/send-reply.
export const reponsesIa: StoryContent = {
  family: 'produit',
  breadcrumb: [CRUMB, { label: 'Réponses assistées', href: '/produit/reponses-ia' }],
  title: 'Le brouillon est déjà écrit. À vous de voir.',
  lede: 'Répondre à un message simple prend deux minutes : relire, trouver la formule, écrire, relire. Quinze fois par jour, ça fait une demi-heure à rédiger des phrases qui se ressemblent.',
  hero: { scene: <ReplyVisual /> },
  chapters: [
    {
      marker: '01',
      heading: 'Il tranche, au lieu de rester vague',
      body: (
        <>
          <p>
            Un brouillon qui dit « je reviens vers vous rapidement » ne vous épargne rien : il faudra le
            réécrire. Celui de Sveltly prend position selon ce que dit le message — il accepte, il refuse,
            il propose un autre créneau.
          </p>
          <p>
            Il est écrit à la première personne, comme si vous aviez pris le clavier. Pas de « vous
            pourriez répondre que », pas de commentaire entre parenthèses.
          </p>
        </>
      ),
      visual: <SummaryVisual />,
    },
    {
      marker: '02',
      heading: 'Trois tons, et un par client si besoin',
      body: (
        <>
          <p>
            Professionnel, formel, décontracté. Le tutoiement n’apparaît que si le message reçu vous tutoie
            déjà — une règle fixe, parce que se tromper là-dessus coûte plus cher que tout le temps gagné.
          </p>
          <p>
            Un ton peut être retenu pour un contact précis. <strong>Le client qui vous appelle par votre
            prénom depuis trois ans gardera le registre décontracté</strong>, même si votre réglage général
            dit l’inverse.
          </p>
        </>
      ),
      flip: true,
    },
    {
      marker: '03',
      heading: 'Rien ne part sans votre clic',
      body: (
        <p>
          C’est une règle du produit, pas une option à décocher. Il n’existe aucun réglage pour automatiser
          l’envoi. Le texte est modifiable directement, et vous pouvez le régénérer s’il ne vous convient
          pas. L’envoi part ensuite de votre adresse Gmail, après votre action.
        </p>
      ),
    },
    {
      heading: 'Pour un message suspect, pas de brouillon',
      body: (
        <p>
          Quand un email ressemble à une tentative d’hameçonnage, Sveltly ne propose pas de réponse. Il
          explique ce qui a déclenché la suspicion — une adresse qui ne correspond pas au nom affiché, par
          exemple — et vous conseille de ne pas répondre.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Un email peut-il partir sans que je le voie ?', a: 'Non. Sveltly rédige des brouillons ; l’envoi demande une action de votre part à chaque fois. Aucun réglage ne permet de contourner ça.' },
    { q: 'Le brouillon peut-il inventer une information ?', a: 'La consigne est stricte : toute affirmation doit venir d’un élément présent dans le message reçu. Une information manquante est contournée plutôt que devinée. C’est aussi pourquoi la relecture reste nécessaire.' },
    { q: 'Combien de réponses par mois ?', a: 'Cinquante sur le forfait gratuit, sans limite sur le Pro. Au-delà des cinquante, le tri continue par mots-clés plutôt que par IA ; les résumés, les tâches et la planification automatique s’arrêtent jusqu’au mois suivant, puisqu’ils sortent de la même analyse que les brouillons.' },
    { q: 'Dans quelle langue sont écrites les réponses ?', a: 'Français, anglais, ou la langue du message reçu — au choix, dans vos réglages.' },
  ],
  related: ['/produit/resume-du-jour', '/tarifs', '/securite/donnees-gmail'],
  cta: {
    title: 'Essayez sur un message qui attend depuis hier',
    body: 'Connectez Gmail, ouvrez celui que vous repoussez depuis hier soir, et lisez ce qui est proposé.',
  },
}

// --- Tâches — gabarit journée type -------------------------------------------
// Bloc auto_tasks dans app/api/emails/route.ts + app/(app)/tasks.
export const taches: DayContent = {
  family: 'produit',
  breadcrumb: [CRUMB, { label: 'Tâches automatiques', href: '/produit/taches' }],
  title: 'Vos tâches sont déjà dans vos emails',
  lede: 'Elles ne ressemblent pas à des tâches. Elles sont au milieu d’un paragraphe, entre deux politesses : « pense à m’envoyer le devis », « il faudrait valider avant jeudi ».',
  visual: <TasksVisual />,
  spot: <SpotTasks size={250} />,
  moments: [
    {
      time: '09:00',
      heading: 'La liste existe avant vous',
      body: (
        <p>
          Sept tâches, dont trois créées pendant le week-end à partir de messages reçus. Vous n’avez rien
          recopié. Deux sont en retard — des demandes de vendredi soir que vous aviez lues sans y répondre.
        </p>
      ),
    },
    {
      time: '09:02',
      heading: 'Le retard se rattrape en un clic',
      body: (
        <p>
          Un bouton replanifie les tâches en retard à aujourd’hui. Pour dix tâches, c’est un geste au lieu
          de dix. Vous commencez par celle du client qui attend depuis le plus longtemps.
        </p>
      ),
    },
    {
      time: '11:30',
      heading: 'Une demande arrive, elle est notée',
      body: (
        <p>
          « Peux-tu relire la proposition avant la fin de semaine ? » devient une tâche intitulée
          <strong> Relire la proposition</strong>, datée au vendredi. Le titre vient du message, pas d’un
          gabarit : jamais de « Traiter l’email » générique.
        </p>
      ),
    },
    {
      time: '14:15',
      heading: 'Ce qui ne devient jamais une tâche',
      quiet: true,
      body: (
        <p>
          Un code de vérification à usage unique. Un lien de réinitialisation. Une invitation à répondre à
          un sondage. Ces messages expirent ou ne vous concernent pas vraiment — en faire des lignes à
          cocher remplirait la liste de choses déjà obsolètes.
        </p>
      ),
    },
    {
      time: '18:00',
      heading: 'Cinq tâches cochées, aucune écrite à la main',
      body: (
        <p>
          Les tâches terminées restent visibles trente jours, puis se chargent à la demande. La liste du
          lendemain se construit pendant que vous dormez.
        </p>
      ),
    },
  ],
  takeaways: [
    {
      heading: 'Les dates vagues deviennent des dates',
      body: <p>« Avant la fin de semaine », « sous 48 h », « lundi prochain » : chacune est convertie en date réelle, calculée depuis la réception du message. Deux personnes ne comprennent pas « fin de semaine » pareil ; une date, si.</p>,
    },
    {
      heading: 'Glisser pour replanifier',
      body: <p>Déposer une tâche sur le groupe « Aujourd’hui » change son échéance. Déposer sur « Sans échéance » l’efface. Le reste du temps, le glisser-déposer réordonne simplement.</p>,
    },
  ],
  faq: [
    { q: 'Puis-je désactiver la création automatique ?', a: 'Oui, dans les réglages. Vous gardez la possibilité de créer des tâches à la main, qu’elles viennent d’un email ou non.' },
    { q: 'Une relance crée-t-elle un doublon ?', a: 'Non. Une seule tâche par message source. Un client qui relance trois fois ne produit pas trois lignes.' },
  ],
  related: ['/produit/agenda', '/produit/tri-intelligent', '/solutions/consultants'],
  cta: {
    title: 'Regardez ce qui dort dans vos emails',
    body: 'Connectez Gmail. Les demandes des derniers jours remontent en liste, avec leurs dates.',
  },
}

// --- Agenda — gabarit démonstration ------------------------------------------
// lib/scheduling.ts (placement conscient des conflits) + lib/google-calendar-sync.ts.
export const agenda: DemoContent = {
  family: 'produit',
  breadcrumb: [CRUMB, { label: 'Agenda par priorité', href: '/produit/agenda' }],
  title: 'Le rendez-vous se place, vous validez',
  lede: 'Prendre un rendez-vous par email demande quatre gestes : relire pour retrouver la date, ouvrir l’agenda, vérifier qu’il n’y a pas de conflit, créer l’événement.',
  demo: { visual: <AgendaVisual /> },
  headerSpot: <SpotAgenda size={190} />,
  annotations: [
    { n: 1, title: 'La date est extraite', body: 'Jour, heure de début, heure de fin quand elle se déduit. Les formulations relatives sont calculées depuis la réception du message.' },
    { n: 2, title: 'Le créneau est vérifié', body: 'Contre vos horaires de travail, votre temps de battement entre deux rendez-vous, et ce qui est déjà posé ce jour-là.' },
    { n: 3, title: 'Vous gardez la main', body: 'Créneau libre : l’événement est créé. Conflit : rien ne bouge, une alternative vous est proposée.' },
  ],
  sections: [
    {
      heading: 'Rien n’est déplacé dans votre dos',
      body: (
        <>
          <p>
            Un rendez-vous urgent peut proposer de décaler un événement moins prioritaire. <strong>Proposer,
            pas appliquer.</strong> Le déplacement attend votre accord.
          </p>
          <p>
            Trois catégories ne bougent jamais, même avec votre accord sur le reste : les événements
            importés de Google Calendar, ceux qui ont des invités, et ceux que vous avez verrouillés.
            Déplacer une réunion à laquelle six personnes sont conviées n’est pas une décision d’algorithme.
          </p>
        </>
      ),
    },
    {
      heading: 'Deux agendas qui restent alignés',
      body: (
        <p>
          Avec la synchronisation Google Calendar, un changement d’un côté se répercute de l’autre, dans les
          deux sens. Sans elle, les événements vivent dans l’agenda interne de Sveltly et la planification
          automatique couvre les sept prochains jours.
        </p>
      ),
      note: 'La synchronisation Google Calendar fait partie du forfait Pro.',
    },
    {
      heading: 'Quand la date est trop floue',
      body: (
        <p>
          « On se cale un truc la semaine prochaine ? » ne produit aucun événement. S’il n’y a pas de date
          exploitable, rien n’est créé. La mention reste signalée dans le message, et un bouton permet
          d’ajouter le rendez-vous à la main une fois la date fixée.
        </p>
      ),
    },
  ],
  faq: [
    { q: 'Et si deux emails proposent le même créneau ?', a: 'Le second déclenche un conflit. Rien n’est créé par-dessus : une alternative vous est proposée, et vous choisissez.' },
    { q: 'Mes horaires de travail sont-ils respectés ?', a: 'Oui. Heure de début, heure de fin et temps de battement entre deux rendez-vous sont réglables, et la planification s’y tient.' },
  ],
  related: ['/produit/taches', '/tarifs', '/solutions/consultants'],
  cta: {
    title: 'Laissez le prochain rendez-vous se placer',
    body: 'Connectez Gmail et votre agenda. Le prochain créneau proposé par email trouvera sa place tout seul.',
  },
}

// --- Tri : visuel exporté pour la page d'aperçu ------------------------------
export { SortingVisual }
