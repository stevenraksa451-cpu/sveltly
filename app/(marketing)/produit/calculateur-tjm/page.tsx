import EditorialPage from '@/components/marketing/templates/EditorialPage'
import ImpactCalculator from '@/components/landing/ImpactCalculator'
import { pageMeta } from '@/lib/content/meta'
import { SAVINGS_RATIO } from '@/lib/time-saved'

export const metadata = pageMeta({
  title: 'Calculateur de TJM',
  description: 'Combien vous coûte le temps passé sur vos emails, à votre tarif horaire. Outil public, sans inscription, méthode affichée.',
  path: '/produit/calculateur-tjm',
})

const PERCENT = Math.round(SAVINGS_RATIO * 100)

export default function Page() {
  return (
    <EditorialPage
      content={{
        family: 'produit',
        breadcrumb: [
          { label: 'Produit', href: '/produit' },
          { label: 'Calculateur de TJM', href: '/produit/calculateur-tjm' },
        ],
        title: 'Vos emails ne figurent sur aucune facture',
        lede: 'Trier sa boîte est du travail. Ce n’est pas du travail facturé. Cet outil met un montant sur ces heures-là.',
        standfirst: 'Déplacez le curseur, le montant suit. Rien n’est enregistré, rien n’est envoyé : tout se calcule dans votre navigateur.',
        blocks: [
          {
            heading: 'Pourquoi pas 100 % du temps',
            body: (
              <>
                <p>
                  Il aurait été facile d’afficher la totalité des heures saisies comme « récupérées ». Le
                  chiffre serait plus gros, et faux : Sveltly accélère le traitement, il ne le supprime pas.
                  Il reste à lire un résumé, relire un brouillon, confirmer un créneau.
                </p>
                <p>
                  Le taux appliqué est de <strong>{PERCENT} %</strong>. Il n’a pas été choisi pour
                  impressionner : il découle des mêmes durées de traitement que le compteur « temps
                  économisé » affiché dans le produit une fois le compte créé.
                </p>
              </>
            ),
            figure: { value: `${PERCENT} %`, caption: 'du temps email rendu, selon la méthode affichée sous le calcul' },
          },
          {
            heading: 'Ce que vous verrez ensuite',
            body: (
              <p>
                Une fois connecté, le tableau de bord affiche un compteur quotidien calculé sur vos vrais
                messages — pas sur une estimation. Il sera presque certainement différent de ce que donne ce
                simulateur, parce qu’il dépend de ce que vous recevez vraiment. C’est le seul chiffre qui
                vous concerne.
              </p>
            ),
            aside: 'Ce calculateur est un outil public, pas une fonctionnalité de l’application connectée.',
          },
        ],
        faq: [
          { q: 'Mes données sont-elles envoyées quelque part ?', a: 'Non. Le calcul se fait entièrement dans votre navigateur. Rien n’est transmis ni enregistré, et aucun compte n’est nécessaire.' },
          { q: 'Les taux de change sont-ils à jour ?', a: 'Non. Ce sont des repères indicatifs datés d’août 2026, affichés sous le calcul. Ils ne sont pas actualisés en temps réel.' },
          { q: 'D’où vient le taux appliqué ?', a: 'Des durées de traitement manuel comparées au temps résiduel avec Sveltly, pour un mix d’emails typique. La méthode est détaillée dans le produit, dans l’info-bulle du compteur « temps économisé ».' },
        ],
        related: ['/tarifs', '/produit/tri-intelligent', '/produit'],
        cta: {
          title: 'Le vrai chiffre est sur vos emails',
          body: 'Connectez Gmail et regardez le compteur du tableau de bord après une journée.',
        },
      }}
    >
      <ImpactCalculator />
    </EditorialPage>
  )
}
