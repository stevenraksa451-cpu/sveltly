import BeforeAfterPage from '@/components/marketing/templates/BeforeAfterPage'
import { pageMeta } from '@/lib/content/meta'
import { triIntelligent } from '@/lib/content/produit'

export const metadata = pageMeta({
  title: 'Tri intelligent des emails',
  description: 'Sept messages, deux qui comptent. Sveltly classe vos emails par ce qu’ils coûtent si vous les ratez, pas par heure d’arrivée.',
  path: '/produit/tri-intelligent',
})

export default function Page() {
  return <BeforeAfterPage content={triIntelligent} />
}
