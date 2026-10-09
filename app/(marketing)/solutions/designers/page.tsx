import BeforeAfterPage from '@/components/marketing/templates/BeforeAfterPage'
import { pageMeta } from '@/lib/content/meta'
import { designers } from '@/lib/content/solutions'

export const metadata = pageMeta({
  title: 'Sveltly pour les designers',
  description: 'Un email, six demandes, un paragraphe. Chaque demande sur sa ligne, les corrections en tâches.',
  path: '/solutions/designers',
})

export default function Page() {
  return <BeforeAfterPage content={designers} />
}
