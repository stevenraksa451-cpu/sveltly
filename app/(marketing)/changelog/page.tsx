import EditorialPage from '@/components/marketing/templates/EditorialPage'
import Reveal from '@/components/marketing/Reveal'
import { pageMeta } from '@/lib/content/meta'
import { SpotFlow } from '@/components/marketing/visuals/Spots'
import styles from './changelog.module.css'

export const metadata = pageMeta({
  title: 'Nouveautés',
  description: 'Ce qui change dans Sveltly, daté. Une seule entrée pour l’instant : le lancement.',
  path: '/changelog',
})

// Une seule entrée, celle du lancement. Inventer un historique de versions
// pour « remplir » la page serait le plus court chemin vers un changelog
// auquel personne ne croit — et c'est le genre de document qui ne vaut que
// par sa crédibilité.
type Entry = {
  date: string
  label: string
  title: string
  items: { kind: 'nouveau' | 'amélioré' | 'corrigé'; text: string }[]
}

const ENTRIES: Entry[] = [
  {
    date: '2026-10-09',
    label: 'Lancement',
    title: 'Sveltly ouvre',
    items: [
      { kind: 'nouveau', text: 'Tri des emails en trois niveaux, fondé sur des signaux concrets plutôt que sur le ton du message.' },
      { kind: 'nouveau', text: 'Résumé en une phrase par email, et points clés quand le message contient plusieurs demandes.' },
      { kind: 'nouveau', text: 'Brouillons de réponse dans trois tons, avec choix de la langue et ton mémorisable par contact.' },
      { kind: 'nouveau', text: 'Tâches créées à partir des actions demandées, avec conversion des dates relatives.' },
      { kind: 'nouveau', text: 'Agenda conscient des conflits, et synchronisation Google Calendar sur le forfait Pro.' },
      { kind: 'nouveau', text: 'Connexion de plusieurs boîtes Gmail, doublons écartés.' },
      { kind: 'nouveau', text: 'Recherche dans les emails, tâches et événements avec Ctrl + K.' },
    ],
  },
]

const KIND_LABEL = { nouveau: 'Nouveau', amélioré: 'Amélioré', corrigé: 'Corrigé' }

function frenchDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Page() {
  return (
    <EditorialPage
      content={{
        breadcrumb: [{ label: 'Nouveautés', href: '/changelog' }],
        title: 'Ce qui change, et quand',
        lede: 'Chaque évolution est notée ici avec sa date. Les corrections aussi — elles comptent autant que le reste.',
        headerSpot: <SpotFlow size={190} />,
        blocks: [],
        related: ['/produit', '/faq', '/contact'],
        cta: {
          title: 'Il manque quelque chose ?',
          body: 'Ce qui remonte le plus souvent finit en haut de la liste. Écrivez-nous.',
          label: 'Nous écrire',
        },
      }}
    >
      <section className={styles.section}>
        {ENTRIES.map(entry => (
          <article key={entry.label} className={styles.entry}>
            <Reveal className={styles.meta} from="left">
              <time className={styles.date} dateTime={entry.date}>{frenchDate(entry.date)}</time>
              <span className={styles.label}>{entry.label}</span>
            </Reveal>

            <div className={styles.body}>
              <Reveal as="h2" className={styles.entryTitle}>{entry.title}</Reveal>
              <ul className={styles.items}>
                {entry.items.map((item, i) => (
                  <Reveal key={item.text} as="li" index={Math.min(i, 5)} className={styles.item}>
                    <span className={`${styles.kind} ${styles[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
                    <span className={styles.text}>{item.text}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </article>
        ))}

        <p className={styles.note}>
          Une seule entrée pour l’instant : le produit vient d’ouvrir. Les suivantes arriveront au rythme
          des versions, pas à celui d’un calendrier éditorial.
        </p>
      </section>
    </EditorialPage>
  )
}
