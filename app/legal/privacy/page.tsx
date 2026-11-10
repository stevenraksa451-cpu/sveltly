// app/legal/privacy/page.tsx
import PrivacyContent from '@/components/legal/PrivacyContent'

export const metadata = {
  // Titre NU : le gabarit `title.template` du layout racine ajoute deja
  // « — Sveltly ». Ecrit ici, il s'affichait DEUX fois dans l'onglet
  // (« Politique de confidentialite — Sveltly — Sveltly »). Voir CLAUDE.md.
  title: 'Politique de confidentialité',
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
