import DemoPage from '@/components/marketing/templates/DemoPage'
import { pageMeta } from '@/lib/content/meta'
import { redacteursTraducteurs } from '@/lib/content/solutions'

export const metadata = pageMeta({
  title: 'Sveltly pour les rédacteurs et traducteurs',
  description: '« Pour la fin de semaine » ne veut pas dire la même chose pour tout le monde. Les dates relatives deviennent des dates.',
  path: '/solutions/redacteurs-traducteurs',
})

export default function Page() {
  return <DemoPage content={redacteursTraducteurs} />
}
