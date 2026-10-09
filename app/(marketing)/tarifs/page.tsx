import Link from 'next/link'
import EditorialPage from '@/components/marketing/templates/EditorialPage'
import Reveal from '@/components/marketing/Reveal'
import { pageMeta } from '@/lib/content/meta'
import { PLANS } from '@/lib/plans'
import { CTA_PRIMARY_HREF } from '@/lib/brand'
import { SpotGauge } from '@/components/marketing/visuals/Spots'
import styles from './tarifs.module.css'

export const metadata = pageMeta({
  title: 'Tarifs',
  description: 'Gratuit sans limite de durée, Pro à 12 € par mois. Ce que chaque forfait contient vraiment, et ce qui n’est pas encore branché.',
  path: '/tarifs',
})

// Prix et listes viennent de lib/plans.tsx, qui alimente aussi l'onglet
// Forfait dans l'application. Les redéclarer ici garantirait qu'ils divergent
// au premier changement de tarif.
const [free, pro] = PLANS

// Chaque ligne correspond à une limite réellement appliquée dans le code.
const ROWS: { label: string; free: string; pro: string }[] = [
  { label: 'Boîtes Gmail connectées', free: '1', pro: 'Illimitées' },
  { label: 'Tri automatique', free: 'Illimité', pro: 'Illimité' },
  { label: 'Résumé du jour', free: 'Inclus', pro: 'Inclus' },
  { label: 'Brouillons de réponse', free: '50 par mois', pro: 'Illimités' },
  { label: 'Tâches issues des emails', free: 'Inclus', pro: 'Inclus' },
  { label: 'Planification automatique', free: '7 jours à l’avance', pro: 'Sans limite de délai' },
  { label: 'Synchronisation Google Calendar', free: '—', pro: 'Dans les deux sens' },
  { label: 'Support', free: 'Par email', pro: 'Prioritaire' },
]

export default function Page() {
  return (
    <EditorialPage
      content={{
        breadcrumb: [{ label: 'Tarifs', href: '/tarifs' }],
        title: 'Gratuit, et pas pendant quatorze jours',
        lede: 'Le forfait gratuit n’est pas une démonstration qui expire. Il reste utilisable aussi longtemps que vous voulez, avec ses limites écrites noir sur blanc.',
        headerSpot: <SpotGauge size={190} />,
        blocks: [
          {
            heading: 'Ce que coûte le Pro, et pourquoi',
            body: (
              <>
                <p>
                  Chaque brouillon de réponse a un coût réel : l’analyse d’un message passe par un modèle
                  qui se facture au volume. Cinquante par mois tiennent dans ce que nous pouvons offrir.
                  Au-delà, il faut bien que quelqu’un paie.
                </p>
                <p>
                  Le reste — le tri, les résumés, les tâches — continue de fonctionner sans limite sur le
                  forfait gratuit, y compris après les cinquante brouillons.
                </p>
              </>
            ),
            aside: 'Le paiement en ligne n’est pas encore branché. Pour passer au Pro, écrivez-nous : on s’en occupe à la main.',
          },
        ],
        faq: [
          { q: 'Que se passe-t-il après 50 brouillons ?', a: 'Le tri, les résumés et les tâches continuent normalement. Seule la génération de nouveaux brouillons s’arrête jusqu’au mois suivant, avec un classement de repli par mots-clés.' },
          { q: 'Puis-je changer de forfait ?', a: 'Dans les deux sens, à tout moment. Il n’y a pas d’engagement : l’abonnement annuel est simplement facturé en une fois, avec une remise.' },
          { q: 'Faut-il une carte bancaire pour commencer ?', a: 'Non. La création de compte et le forfait gratuit n’en demandent pas.' },
          { q: 'Que vaut la synchronisation Google Calendar ?', a: 'Elle fait partie du Pro. En gratuit, les événements vivent dans l’agenda interne de Sveltly et la planification automatique couvre les sept prochains jours.' },
        ],
        related: ['/produit/reponses-ia', '/produit/agenda', '/faq'],
        cta: {
          title: 'Commencez par le gratuit',
          body: 'Vous saurez en une semaine si le Pro vous sert. Et sinon, le gratuit ne s’arrête pas.',
        },
      }}
    >
      <section className={styles.plans}>
        {PLANS.map((plan, i) => (
          <Reveal key={plan.id} index={i} className={`${styles.plan} ${plan.id === 'pro' ? styles.planPro : ''}`}>
            <h2 className={styles.planName}>{plan.name}</h2>
            <p className={styles.planTagline}>{plan.tagline}</p>
            <p className={styles.planPrice}>
              {plan.priceMonthly === 0 ? '0 €' : `${plan.priceMonthly} €`}
              <span className={styles.planPeriod}>/mois</span>
            </p>
            {plan.priceMonthly > 0 && (
              <p className={styles.planAnnual}>
                ou {String(plan.priceAnnualMonthly).replace('.', ',')} € par mois en payant à l’année
              </p>
            )}
            <Link href={CTA_PRIMARY_HREF} className={plan.id === 'pro' ? styles.planBtnPro : styles.planBtn}>
              {plan.id === 'free' ? 'Créer un compte' : 'Essayer le Pro'}
            </Link>
            <ul className={styles.planList}>
              {plan.features.map(f => <li key={f}>{f}</li>)}
            </ul>
          </Reveal>
        ))}
      </section>

      <section className={styles.tableSection}>
        <Reveal as="h2" className={styles.tableTitle}>Ligne par ligne</Reveal>
        {/* Le conteneur défile seul sur mobile : la page, elle, ne part
            jamais de travers. */}
        <Reveal index={1} className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Comparaison des forfaits Gratuit et Pro</caption>
            <thead>
              <tr>
                <th scope="col">Fonctionnalité</th>
                <th scope="col">{free.name}</th>
                <th scope="col">{pro.name}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.free}</td>
                  <td className={styles.proCell}>{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>
    </EditorialPage>
  )
}
