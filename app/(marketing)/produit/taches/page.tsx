import DayPage from '@/components/marketing/templates/DayPage'
import { pageMeta } from '@/lib/content/meta'
import { taches } from '@/lib/content/produit'

export const metadata = pageMeta({
  title: 'Tâches issues de vos emails',
  description: 'Vos tâches sont déjà dans vos emails, au milieu des paragraphes. Sveltly les en sort, avec leur date.',
  path: '/produit/taches',
})

export default function Page() {
  return <DayPage content={taches} />
}
