import EditorialPage from '@/components/marketing/templates/EditorialPage'
import { pageMeta } from '@/lib/content/meta'
import { protectionDesDonnees } from '@/lib/content/securite'

export const metadata = pageMeta({
  title: 'Protection des données',
  description: 'Row Level Security, chiffrement AES-256-GCM des jetons, HTTPS. Trois mécanismes décrits précisément, et ce que nous n avons pas.',
  path: '/securite/protection-des-donnees',
})

export default function Page() {
  return <EditorialPage content={protectionDesDonnees} />
}
