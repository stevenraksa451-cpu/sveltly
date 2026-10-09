import DayPage from '@/components/marketing/templates/DayPage'
import { pageMeta } from '@/lib/content/meta'
import { developpeurs } from '@/lib/content/solutions'

export const metadata = pageMeta({
  title: 'Sveltly pour les développeurs',
  description: 'Une interruption coûte plus cher que l interruption. Deux heures sans ouvrir la boîte, sans rien rater.',
  path: '/solutions/developpeurs',
})

export default function Page() {
  return <DayPage content={developpeurs} />
}
