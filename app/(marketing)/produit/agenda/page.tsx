import DemoPage from '@/components/marketing/templates/DemoPage'
import { pageMeta } from '@/lib/content/meta'
import { agenda } from '@/lib/content/produit'

export const metadata = pageMeta({
  title: 'Agenda par priorité',
  description: 'Le rendez-vous mentionné dans un email se place, en tenant compte de vos horaires et des conflits. Vous validez.',
  path: '/produit/agenda',
})

export default function Page() {
  return <DemoPage content={agenda} />
}
