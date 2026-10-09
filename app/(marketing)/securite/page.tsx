import EditorialPage from '@/components/marketing/templates/EditorialPage'
import HubList from '@/components/marketing/HubList'
import SecurityFlowVisual from '@/components/marketing/visuals/SecurityFlowVisual'
import { pageMeta } from '@/lib/content/meta'
import { SECURITY_LINKS } from '@/lib/navigation'
import { SpotSecurity } from '@/components/marketing/visuals/Spots'

export const metadata = pageMeta({
  title: 'Sécurité',
  description: 'Ce que Sveltly lit, ce qu’il ne fait jamais, et ce que nous n’avons pas. Connexion Google OAuth, cloisonnement par compte, jetons chiffrés.',
  path: '/securite',
})

export default function Page() {
  return (
    <EditorialPage
      content={{
        family: 'securite',
        breadcrumb: [{ label: 'Sécurité', href: '/securite' }],
        title: 'Ce que nous faisons de vos emails',
        lede: 'Confier sa boîte mail à un service tiers n’est pas anodin. Vos messages contiennent vos tarifs, vos contrats, vos échanges clients.',
        visual: <SecurityFlowVisual />,
        headerSpot: <SpotSecurity size={190} />,
        standfirst: 'Beaucoup de pages sécurité alignent des logos de certification et des formules employées là où elles n’ont techniquement aucun sens. Ça rassure à la lecture, et ça ne veut rien dire.',
        blocks: [
          {
            heading: 'Notre règle : seulement ce qui est vérifiable',
            body: (
              <>
                <p>
                  Cette page et les trois qui suivent ne décrivent que des mécanismes réellement en place
                  dans le code. Quand quelque chose n’existe pas, c’est écrit.
                </p>
                <p>
                  Sveltly ne détient <strong>aucune certification</strong>, et ne propose
                  <strong> pas de chiffrement de bout en bout</strong> — ce serait incompatible avec
                  l’analyse de vos messages. Nous le disons ici plutôt que de l’esquiver.
                </p>
              </>
            ),
            aside: 'Un produit récent n’a pas de certification. Prétendre le contraire serait le détail qui rend tout le reste suspect.',
          },
          {
            heading: 'Le résumé en trois points',
            body: (
              <>
                <p>
                  La connexion Gmail passe par Google OAuth : votre mot de passe ne transite jamais par nos
                  serveurs. Vos données sont cloisonnées par le Row Level Security de PostgreSQL, actif sur
                  toutes les tables. Les jetons d’accès Google sont chiffrés en AES-256-GCM avant stockage.
                </p>
                <p>
                  Et vous pouvez tout retirer depuis vos réglages, sans délai et sans nous écrire.
                </p>
              </>
            ),
            figure: { value: '8', caption: 'tables protégées par une politique par utilisateur' },
          },
        ],
        pullQuote: 'Pour trier un email, il faut le lire. Tout le reste découle de là.',
        faq: [
          { q: 'Mes emails servent-ils à entraîner une IA ?', a: 'Non. Ils sont analysés pour produire votre classement, vos résumés et vos brouillons, et pour rien d’autre. Ils ne sont ni revendus, ni utilisés pour entraîner un modèle.' },
          { q: 'Êtes-vous conformes au RGPD ?', a: 'Les traitements, finalités et durées de conservation sont décrits dans la politique de confidentialité. C’est ce document qui fait foi, pas cette page.' },
        ],
        related: ['/legal/privacy', '/legal/terms'],
        cta: {
          title: 'Lisez avant de connecter',
          body: 'La politique de confidentialité détaille les données collectées, les durées de conservation et les sous-traitants.',
          label: 'Lire la politique de confidentialité',
        },
      }}
    >
      <HubList title="Dans le détail" links={SECURITY_LINKS} />
    </EditorialPage>
  )
}
