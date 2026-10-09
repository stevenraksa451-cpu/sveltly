import EditorialPage from '@/components/marketing/templates/EditorialPage'
import ContactLinks from '@/components/marketing/ContactLinks'
import { pageMeta } from '@/lib/content/meta'
import { SpotReply } from '@/components/marketing/visuals/Spots'

export const metadata = pageMeta({
  title: 'Nous écrire',
  description: 'Une question, un bug, une idée, ou l’envie de passer au forfait Pro. Les messages sont lus et les réponses écrites à la main.',
  path: '/contact',
})

export default function Page() {
  return (
    <EditorialPage
      content={{
        breadcrumb: [{ label: 'Nous écrire', href: '/contact' }],
        title: 'Écrivez-nous',
        lede: 'Sveltly est porté par une petite équipe. Les messages sont lus, et les réponses écrites à la main.',
        headerSpot: <SpotReply size={190} />,
        blocks: [
          {
            heading: 'Pas de formulaire',
            body: (
              <p>
                Il n’y en a pas, et c’est volontaire : aucune route d’envoi n’existe côté serveur. Un
                formulaire qui n’envoie rien vaut moins qu’une adresse email honnête. Choisissez un sujet
                ci-dessous, votre logiciel de messagerie s’ouvrira avec l’objet déjà rempli.
              </p>
            ),
            aside: 'Comptez environ quarante-huit heures ouvrées. Les utilisateurs du forfait Pro passent en priorité.',
          },
        ],
        faq: [
          { q: 'Proposez-vous un chat en direct ?', a: 'Non. L’email est le seul canal, et c’est assumé : il laisse le temps d’écrire une vraie réponse plutôt qu’une réponse rapide.' },
          { q: 'Puis-je demander une fonctionnalité ?', a: 'Oui, et c’est utile. Ce qui vous manque oriente la suite plus sûrement que nos propres hypothèses.' },
        ],
        related: ['/faq', '/securite/controle-de-vos-donnees'],
        cta: {
          title: 'En attendant, vous pouvez essayer',
          body: 'La création de compte est gratuite et ne demande pas de carte bancaire.',
        },
      }}
    >
      <ContactLinks />
    </EditorialPage>
  )
}
