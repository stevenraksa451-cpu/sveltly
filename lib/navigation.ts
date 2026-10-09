// lib/navigation.ts
// Source unique de la navigation : barre du haut, pied de page et blocs
// "Voir aussi" lisent tous ce fichier. Ajouter une page = ajouter une entrée
// ici, et elle apparaît partout de façon cohérente.
//
// Les icônes ne sont pas ici mais dans components/landing/icons.tsx : ce
// fichier reste du .ts (données pures), ce qui permet de l'importer depuis
// n'importe où, y compris des composants serveur et le sitemap.

export type IconKey =
  | 'sort' | 'summary' | 'checkSquare' | 'calendar' | 'reply' | 'gauge'
  | 'code' | 'palette' | 'briefcase' | 'pen'
  | 'help' | 'mail' | 'sparkles'
  | 'key' | 'database' | 'shield' | 'lock' | 'trash' | 'scale'

export interface NavLink {
  label: string
  desc: string
  href: string
  icon: IconKey
  /** Badge discret (ex. fonctionnalité réservée au forfait Pro). */
  tag?: string
}

export interface NavSection {
  id: string
  label: string
  /** Page d'aperçu du menu ("Voir tout le produit →"). */
  overview?: { label: string; href: string }
  layout: 'mega' | 'list'
  columns?: 1 | 2
  links: NavLink[]
}

// --- PRODUIT -----------------------------------------------------------------
// Une entrée par fonctionnalité réellement implémentée. La référence dans le
// code est indiquée en commentaire pour que cette liste reste vérifiable.
export const PRODUCT_LINKS: NavLink[] = [
  { label: 'Tri intelligent', desc: 'Urgent, important ou normal — décidé pour vous.', href: '/produit/tri-intelligent', icon: 'sort' },
  { label: 'Résumé du jour', desc: 'Une phrase par email, pour trancher sans tout lire.', href: '/produit/resume-du-jour', icon: 'summary' },
  { label: 'Réponses assistées', desc: 'Un brouillon prêt à relire, dans votre ton.', href: '/produit/reponses-ia', icon: 'reply' },
  { label: 'Tâches automatiques', desc: 'Les actions demandées deviennent des tâches.', href: '/produit/taches', icon: 'checkSquare' },
  { label: 'Agenda par priorité', desc: 'Vos rendez-vous placés au bon moment.', href: '/produit/agenda', icon: 'calendar' },
  { label: 'Calculateur de TJM', desc: 'Ce que votre temps email vous coûte vraiment.', href: '/produit/calculateur-tjm', icon: 'gauge' },
]

export const SOLUTION_LINKS: NavLink[] = [
  { label: 'Développeurs', desc: 'Protégez vos plages de concentration.', href: '/solutions/developpeurs', icon: 'code' },
  { label: 'Designers', desc: 'Des retours clients déjà résumés.', href: '/solutions/designers', icon: 'palette' },
  { label: 'Consultants', desc: 'Ne ratez plus une relance qui compte.', href: '/solutions/consultants', icon: 'briefcase' },
  { label: 'Rédacteurs & traducteurs', desc: 'Briefs et délais extraits tout seuls.', href: '/solutions/redacteurs-traducteurs', icon: 'pen' },
]

// Volontairement court : pas de blog ni de guides tant qu'aucun article réel
// n'existe. Une rubrique "bientôt disponible" est une promesse, pas une
// ressource.
export const RESOURCE_LINKS: NavLink[] = [
  { label: 'Questions fréquentes', desc: 'Ce qu’on nous demande le plus souvent.', href: '/faq', icon: 'help' },
  { label: 'Nouveautés', desc: 'Ce qui change dans le produit, daté.', href: '/changelog', icon: 'sparkles' },
  { label: 'Nous écrire', desc: 'Une question, un bug, une idée.', href: '/contact', icon: 'mail' },
]

// Chaque page listée ici ne décrit que des mécanismes présents dans le dépôt.
export const SECURITY_LINKS: NavLink[] = [
  { label: 'Vos données Gmail', desc: 'Ce qui est lu, et ce qui n’est jamais fait.', href: '/securite/donnees-gmail', icon: 'key' },
  { label: 'Protection des données', desc: 'Cloisonnement, chiffrement, authentification.', href: '/securite/protection-des-donnees', icon: 'database' },
  { label: 'Garder le contrôle', desc: 'Déconnecter Gmail, supprimer votre compte.', href: '/securite/controle-de-vos-donnees', icon: 'trash' },
]

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'produit',
    label: 'Produit',
    overview: { label: 'Voir tout le produit', href: '/produit' },
    layout: 'mega',
    links: PRODUCT_LINKS,
  },
  {
    id: 'solutions',
    label: 'Solutions',
    overview: { label: 'Tous les profils', href: '/solutions' },
    layout: 'list',
    columns: 1,
    links: SOLUTION_LINKS,
  },
  {
    id: 'ressources',
    label: 'Ressources',
    layout: 'list',
    columns: 1,
    links: RESOURCE_LINKS,
  },
  {
    id: 'securite',
    label: 'Sécurité',
    overview: { label: 'Notre approche de la sécurité', href: '/securite' },
    layout: 'list',
    columns: 1,
    links: SECURITY_LINKS,
  },
]

export const NAV_DIRECT_LINK = { label: 'Tarifs', href: '/tarifs' }

// Les pages légales existent déjà sous /legal/* avec leur propre mise en
// page (sommaire collant, encadré "l'essentiel"). On pointe dessus plutôt que
// de créer des doublons : deux URL pour un même texte juridique, c'est deux
// versions qui finissent par diverger.
export const LEGAL_LINKS: NavLink[] = [
  { label: 'Confidentialité', desc: 'Données collectées et usages.', href: '/legal/privacy', icon: 'lock' },
  { label: 'Conditions d’utilisation', desc: 'Le cadre du service.', href: '/legal/terms', icon: 'scale' },
]

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  { title: 'Produit', links: PRODUCT_LINKS },
  { title: 'Solutions', links: SOLUTION_LINKS },
  { title: 'Ressources', links: RESOURCE_LINKS },
  { title: 'Sécurité', links: SECURITY_LINKS },
  { title: 'Légal', links: LEGAL_LINKS },
]

/** Toutes les routes marketing, pour le sitemap. */
export const ALL_MARKETING_ROUTES: string[] = [
  '/', '/produit', '/solutions', '/securite', '/tarifs', '/faq', '/contact', '/changelog',
  ...PRODUCT_LINKS.map(l => l.href),
  ...SOLUTION_LINKS.map(l => l.href),
  ...SECURITY_LINKS.map(l => l.href),
  '/legal/privacy', '/legal/terms',
]

/** Retrouve le libellé d'une route, pour le fil d'Ariane. */
export function labelForHref(href: string): string | null {
  const all = [...PRODUCT_LINKS, ...SOLUTION_LINKS, ...RESOURCE_LINKS, ...SECURITY_LINKS, ...LEGAL_LINKS]
  return all.find(l => l.href === href)?.label ?? null
}
