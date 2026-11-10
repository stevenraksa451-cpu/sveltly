// app/legal/terms/page.tsx
import TermsContent from '@/components/legal/TermsContent'

export const metadata = {
  // Titre NU : le gabarit `title.template` du layout racine ajoute deja
  // « — Sveltly ». Ecrit ici, il s'affichait DEUX fois dans l'onglet
  // (« Politique de confidentialite — Sveltly — Sveltly »). Voir CLAUDE.md.
  title: 'Conditions générales d’utilisation',
}

export default function TermsPage() {
  return <TermsContent />
}
