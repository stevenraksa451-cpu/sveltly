import StoryPage from '@/components/marketing/templates/StoryPage'
import { TasksVisual, SummaryVisual } from '@/components/marketing/visuals/ProductVisuals'
import { pageMeta } from '@/lib/content/meta'

export const metadata = pageMeta({
  title: 'Pour qui',
  description: 'Développeurs, designers, consultants, rédacteurs : ce que Sveltly change selon ce que vous faites de vos journées.',
  path: '/solutions',
})

export default function Page() {
  return (
    <StoryPage
      content={{
        family: 'solutions',
        breadcrumb: [{ label: 'Solutions', href: '/solutions' }],
        title: 'Personne ne filtre vos emails à votre place',
        lede: 'C’est la différence entre travailler seul et travailler en équipe : il n’y a pas d’assistant, pas de secrétariat, pas de collègue qui vous dit « celui-là, regarde-le ».',
        hero: { scene: <SummaryVisual /> },
        chapters: [
          {
            heading: 'Le même problème, des enjeux différents',
            body: (
              <>
                <p>
                  Qu’on écrive du code, des maquettes, des recommandations ou des textes, la boîte mail finit
                  par piloter l’activité. Elle n’est pas faite pour ça : elle classe par heure d’arrivée et
                  ne sait rien de ce qui compte pour vous.
                </p>
                <p>
                  Ce qui change d’un métier à l’autre, ce n’est pas le fonctionnement du produit —
                  <strong> c’est ce qui remonte</strong>. Un incident de production pour l’un, une facture
                  impayée pour l’autre.
                </p>
              </>
            ),
          },
          {
            marker: 'Développeurs',
            heading: 'Protéger deux heures d’affilée',
            body: (
              <p>
                Une interruption coûte bien plus que la minute qu’elle prend. Les incidents remontent, les
                questions de planning attendent la pause.
                {' '}<a href="/solutions/developpeurs">Voir la journée type</a>.
              </p>
            ),
            visual: <TasksVisual />,
          },
          {
            marker: 'Designers',
            heading: 'Démêler un retour client',
            body: (
              <p>
                Six demandes dans un paragraphe deviennent six lignes, dont les corrections passent en
                tâches datées.
                {' '}<a href="/solutions/designers">Voir avant et après</a>.
              </p>
            ),
            flip: true,
          },
          {
            marker: 'Consultants',
            heading: 'Ne pas rater la relance qui compte',
            body: (
              <p>
                Un devis sans réponse, une facture en retard, un client qui s’agace : ce qui engage de
                l’argent remonte.
                {' '}<a href="/solutions/consultants">Lire comment</a>.
              </p>
            ),
          },
          {
            marker: 'Rédacteurs & traducteurs',
            heading: 'Transformer « fin de semaine » en date',
            body: (
              <p>
                Les échéances formulées au jugé deviennent des dates réelles, calculées depuis la réception
                du message.
                {' '}<a href="/solutions/redacteurs-traducteurs">Voir le détail</a>.
              </p>
            ),
            flip: true,
          },
        ],
        faq: [
          { q: 'Et si mon métier n’est pas dans la liste ?', a: 'Le produit ne connaît pas votre métier : il analyse le contenu réel de vos messages. Ces pages décrivent des situations fréquentes, pas des configurations différentes.' },
          { q: 'Faut-il paramétrer quelque chose selon mon profil ?', a: 'Non. Les seuls réglages utiles sont vos horaires de travail, le ton de vos réponses, et les automatismes que vous choisissez d’activer.' },
        ],
        related: ['/produit/tri-intelligent', '/tarifs', '/securite'],
        cta: {
          title: 'Le test tient en une matinée',
          body: 'Connectez Gmail, travaillez normalement, et regardez à midi ce qui est remonté.',
        },
      }}
    />
  )
}
