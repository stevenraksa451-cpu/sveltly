import EditorialPage from '@/components/marketing/templates/EditorialPage'
import HubList from '@/components/marketing/HubList'
import SortingVisual from '@/components/marketing/visuals/SortingVisual'
import { pageMeta } from '@/lib/content/meta'
import { PRODUCT_LINKS } from '@/lib/navigation'
import { SpotMailboxes } from '@/components/marketing/visuals/Spots'

export const metadata = pageMeta({
  title: 'Le produit',
  description: 'Tri, résumé, brouillons de réponse, tâches et agenda. Ce que Sveltly fait de votre boîte Gmail, fonctionnalité par fonctionnalité.',
  path: '/produit',
})

export default function Page() {
  return (
    <EditorialPage
      content={{
        family: 'produit',
        breadcrumb: [{ label: 'Produit', href: '/produit' }],
        title: 'Votre boîte a déjà fait la moitié du travail',
        lede: 'Sveltly lit vos emails pendant la nuit, les classe, en tire ce qu’il y a à faire, et prépare les réponses. Au matin, il reste les décisions.',
        visual: <SortingVisual />,
        headerSpot: <SpotMailboxes size={190} />,
        standfirst: 'Une boîte mail classe par heure d’arrivée. C’est la seule chose qu’elle sait faire, et c’est rarement ce dont vous avez besoin à 8 h 40.',
        blocks: [
          {
            heading: 'Cinq choses, et c’est tout',
            body: (
              <>
                <p>
                  Sveltly ne cherche pas à remplacer votre messagerie. Il s’y branche et fait cinq choses :
                  il trie, il résume, il rédige des brouillons, il sort les tâches des paragraphes, et il
                  place les rendez-vous.
                </p>
                <p>
                  Chacune est détaillée sur sa propre page, avec ce qu’elle fait et ce qu’elle ne fait pas.
                </p>
              </>
            ),
            aside: 'Outlook n’est pas encore supporté. Seul Gmail est connectable aujourd’hui.',
          },
          {
            heading: 'Ce qui ne changera pas',
            body: (
              <>
                <p>
                  Aucun email ne part sans votre clic. Aucun message n’est supprimé de Gmail. Aucun événement
                  d’agenda n’est déplacé sans votre accord.
                </p>
                <p>
                  Ce ne sont pas des réglages par défaut qu’on pourrait inverser dans une mise à jour :
                  <strong> ce sont des règles du produit</strong>.
                </p>
              </>
            ),
          },
        ],
        pullQuote: 'Le but n’est pas de lire vos emails plus vite. C’est d’en ouvrir moins.',
        faq: [
          { q: 'Faut-il changer d’adresse ?', a: 'Non. Sveltly se connecte à votre boîte Gmail existante. Vos emails continuent d’arriver et de partir depuis votre adresse habituelle.' },
          { q: 'Combien de temps avant de voir quelque chose ?', a: 'Quelques minutes après la connexion. Les messages récents sont analysés en premier, les plus anciens suivent.' },
          { q: 'Outlook est-il prévu ?', a: 'Pas de date annoncée. Nous préférons ne rien promettre tant que ce n’est pas en cours.' },
        ],
        cta: {
          title: 'Connectez une boîte, laissez passer une nuit',
          body: 'Demain matin, vous verrez ce qui remonte et ce qui descend. C’est le seul test qui compte.',
        },
      }}
    >
      <HubList title="Fonctionnalité par fonctionnalité" links={PRODUCT_LINKS} />
    </EditorialPage>
  )
}
