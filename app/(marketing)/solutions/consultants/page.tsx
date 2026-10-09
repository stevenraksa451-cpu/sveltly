import StoryPage from '@/components/marketing/templates/StoryPage'
import { pageMeta } from '@/lib/content/meta'
import { consultants } from '@/lib/content/solutions'

export const metadata = pageMeta({
  title: 'Sveltly pour les consultants',
  description: 'La relance de trop est celle qu on n a pas vue. Ce qui engage de l argent remonte dans la liste.',
  path: '/solutions/consultants',
})

export default function Page() {
  return <StoryPage content={consultants} />
}
