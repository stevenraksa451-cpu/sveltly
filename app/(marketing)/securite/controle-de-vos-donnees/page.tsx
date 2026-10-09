import StoryPage from '@/components/marketing/templates/StoryPage'
import { pageMeta } from '@/lib/content/meta'
import { controleDeVosDonnees } from '@/lib/content/securite'

export const metadata = pageMeta({
  title: 'Garder le contrôle de vos données',
  description: 'Partir doit prendre moins de temps qu arriver. Déconnecter Gmail ou supprimer le compte, depuis vos réglages.',
  path: '/securite/controle-de-vos-donnees',
})

export default function Page() {
  return <StoryPage content={controleDeVosDonnees} />
}
