import DemoPage from '@/components/marketing/templates/DemoPage'
import { pageMeta } from '@/lib/content/meta'
import { resumeDuJour } from '@/lib/content/produit'

export const metadata = pageMeta({
  title: 'Résumé du jour',
  description: 'Une phrase par email qui dit ce qui est demandé et pour quand. Lisez une liste au lieu d ouvrir douze messages.',
  path: '/produit/resume-du-jour',
})

export default function Page() {
  return <DemoPage content={resumeDuJour} />
}
