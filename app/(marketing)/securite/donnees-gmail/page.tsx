import DemoPage from '@/components/marketing/templates/DemoPage'
import { pageMeta } from '@/lib/content/meta'
import { donneesGmail } from '@/lib/content/securite'

export const metadata = pageMeta({
  title: 'Vos données Gmail',
  description: 'Oui, Sveltly lit vos emails. Voici jusqu où, et ce que ça n implique jamais.',
  path: '/securite/donnees-gmail',
})

export default function Page() {
  return <DemoPage content={donneesGmail} />
}
