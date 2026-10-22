import Link from 'next/link'
import EditorialPage from '@/components/marketing/templates/EditorialPage'
import Reveal from '@/components/marketing/Reveal'
import { pageMeta } from '@/lib/content/meta'
import { PLANS } from '@/lib/plans'
import { PROVIDERS_LIVE_LABEL } from '@/lib/providers'
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
// Quatre lignes annonçaient « Illimité » ou « Inclus » côté Gratuit alors que
// le quota mensuel les arrête TOUTES en même temps : passé 50 réponses,
// /api/analyze bascule sur buildFallback, qui classe par mots-clés et ne rend
// ni résumé, ni tâche, ni date de rendez-vous. Elles sortent de la MÊME
// analyse que les brouillons — les afficher séparément laissait croire
// qu’elles survivaient au quota.
const QUOTA_GRATUIT = 'Jusqu’à 50 réponses/mois'

const ROWS: { label: string; free: string; pro: string }[] = [
  // Le nom du fournisseur vient de lib/providers.ts, source unique. Écrit en
  // dur, cette ligne mentirait le jour où Outlook passe en « live » — c’est
  // exactement la contradiction que providers.ts a été créé pour clore.
  { label: 'Boîtes ' + PROVIDERS_LIVE_LABEL + ' connectées', free: '1', pro: 'Illimitées' },
  { label: 'Tri automatique', free: 'Par IA jusqu’à 50 réponses/mois, puis par mots-clés', pro: 'Par IA, sans limite' },
  { label: 'Résumé du jour', free: QUOTA_GRATUIT, pro: 'Sans limite' },
  { label: 'Brouillons de réponse', free: '50 par mois', pro: 'Illimités' },
  { label: 'Tâches issues des emails', free: QUOTA_GRATUIT, pro: 'Sans limite' },
  { label: 'Planification automatique', free: '7 jours à l’avance, jusqu’à 50 réponses/mois', pro: 'Sans limite de délai' },
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
                  Après les cinquante, le tri continue, mais sans IA : un classement de repli par
                  mots-clés, qui range les messages sans les lire. Les résumés, les tâches et la
                  planification automatique s’arrêtent jusqu’au mois suivant — ils sortent tous de la
                  même analyse que les brouillons, et coûtent donc la même chose.
                </p>
              </>
            ),
            aside: 'Le paiement en ligne n’est pas encore branché. Pour passer au Pro, écrivez-nous : on s’en occupe à la main.',
          },
        ],
        faq: [
          { q: 'Que se passe-t-il après 50 brouillons ?', a: 'Le tri continue, par mots-clés plutôt que par IA : vos messages restent rangés par priorité et par type, mais plus rien n’est lu. Les résumés, les tâches et la planification automatique s’arrêtent jusqu’au mois suivant — ils sortent tous de la même analyse que les brouillons. Rien n’est perdu : ces emails sont réanalysés dès que le compteur repart.' },
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
