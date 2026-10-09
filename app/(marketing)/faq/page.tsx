import EditorialPage from '@/components/marketing/templates/EditorialPage'
import { pageMeta } from '@/lib/content/meta'
import { SpotSummary, SpotSecurity, SpotGauge } from '@/components/marketing/visuals/Spots'

export const metadata = pageMeta({
  title: 'Questions fréquentes',
  description: 'Gmail, confidentialité, tarifs, limites du forfait gratuit, et ce qui manque encore. Les réponses, y compris quand c’est « pas encore ».',
  path: '/faq',
})

export default function Page() {
  return (
    <EditorialPage
      content={{
        breadcrumb: [{ label: 'Questions fréquentes', href: '/faq' }],
        title: 'Les questions qu’on nous pose',
        lede: 'Y compris celles dont la réponse est « pas encore ». Si la vôtre n’est pas là, écrivez-nous.',
        headerSpot: <SpotSummary size={190} />,
        blocks: [
          {
            heading: 'Avant de commencer',
            body: (
              <>
                <p>
                  <strong>Quelles boîtes puis-je connecter ?</strong><br />
                  Gmail uniquement. Outlook n’est pas supporté, et aucune date n’est annoncée.
                </p>
                <p>
                  <strong>Faut-il changer d’adresse ?</strong><br />
                  Non. Sveltly se branche sur votre boîte existante. Vos emails continuent d’arriver et de
                  partir depuis votre adresse habituelle.
                </p>
                <p>
                  <strong>Combien de temps avant de voir quelque chose ?</strong><br />
                  Quelques minutes. Les messages récents sont analysés en premier.
                </p>
              </>
            ),
          },
          {
            heading: 'Ce que Sveltly ne fera pas',
            body: (
              <>
                <p>
                  <strong>Peut-il envoyer un email sans moi ?</strong><br />
                  Non. Il rédige des brouillons ; l’envoi demande votre clic à chaque fois. Aucun réglage ne
                  permet de l’automatiser.
                </p>
                <p>
                  <strong>Supprime-t-il des messages dans Gmail ?</strong><br />
                  Jamais. L’archivage automatique sort un email de la boîte de réception ; il reste dans
                  votre compte Google.
                </p>
                <p>
                  <strong>Mes emails servent-ils à entraîner une IA ?</strong><br />
                  Non. Ils servent à produire votre classement, vos résumés et vos brouillons, et à rien
                  d’autre.
                </p>
              </>
            ),
            aside: 'Ces trois réponses sont des règles du produit, pas des réglages par défaut.',
          },
          {
            heading: 'Forfaits et facturation',
            body: (
              <>
                <p>
                  <strong>Le forfait gratuit expire-t-il ?</strong><br />
                  Non. Une boîte connectée, cinquante réponses par mois, planification automatique sur sept
                  jours. Sans limite de durée.
                </p>
                <p>
                  <strong>Et si j’atteins les cinquante réponses ?</strong><br />
                  Le tri, les résumés et les tâches continuent. Seule la génération de nouveaux brouillons
                  s’arrête jusqu’au mois suivant.
                </p>
                <p>
                  <strong>Comment passer au Pro ?</strong><br />
                  Le paiement en ligne n’est pas encore branché. Écrivez-nous et nous nous en occupons à la
                  main.
                </p>
              </>
            ),
          },
          {
            heading: 'Quitter',
            body: (
              <>
                <p>
                  <strong>Puis-je supprimer mon compte ?</strong><br />
                  Oui, depuis vos réglages, en un bouton. Le compte, les données associées et votre photo de
                  profil sont supprimés sans délai.
                </p>
                <p>
                  <strong>Puis-je exporter mes données ?</strong><br />
                  Pas encore en un clic. Écrivez-nous et nous vous les transmettons.
                </p>
              </>
            ),
          },
          {
            heading: 'Le produit est-il fini ?',
            body: (
              <p>
                Non. Sveltly vient d’être lancé. Le paiement en ligne manque, l’export de données aussi,
                Outlook n’est pas là. Ces manques sont signalés là où ils devraient se trouver, plutôt que
                passés sous silence.
              </p>
            ),
          },
        ],
        related: ['/produit', '/tarifs', '/securite'],
        cta: {
          title: 'Une question qui n’est pas ici ?',
          body: 'Écrivez-nous. Les messages sont lus, et les réponses écrites à la main.',
          label: 'Nous écrire',
        },
      }}
    />
  )
}
