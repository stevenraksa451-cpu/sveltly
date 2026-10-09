import StoryPage from '@/components/marketing/templates/StoryPage'
import { pageMeta } from '@/lib/content/meta'
import { reponsesIa } from '@/lib/content/produit'

export const metadata = pageMeta({
  title: 'Réponses assistées',
  description: 'Un brouillon déjà écrit, dans votre ton, qui tranche au lieu de rester vague. Rien ne part sans votre clic.',
  path: '/produit/reponses-ia',
})

export default function Page() {
  return <StoryPage content={reponsesIa} />
}
