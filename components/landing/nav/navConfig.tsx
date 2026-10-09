// Réglages propres à la barre de navigation. Les menus eux-mêmes ne sont plus
// ici : ils vivent dans lib/navigation.ts, partagé avec le pied de page, les
// blocs « Voir aussi » et le sitemap. Ce fichier ne garde que ce qui est
// spécifique à la barre.

// Bandeau d'annonce au-dessus de la barre. Passer à false pour le masquer
// complètement (aucun rendu, aucune place réservée).
export const ANNOUNCEMENT_ENABLED = true
// Changer cet identifiant réaffiche le bandeau à tout le monde, y compris à
// ceux qui l'avaient fermé (la fermeture est mémorisée par identifiant).
export const ANNOUNCEMENT_ID = 'lancement-2026-10'
export const ANNOUNCEMENT_TEXT = 'Sveltly vient d’être lancé — découvrez ce qu’il fait déjà.'
export const ANNOUNCEMENT_HREF = '/changelog'

// Carte mise en avant dans le menu Produit (colonne de droite).
export const PRODUCT_FEATURE_CARD = {
  eyebrow: 'Le cœur du produit',
  title: 'Votre boîte, triée avant que vous l’ouvriez',
  desc: 'Chaque email arrive déjà classé, résumé, et accompagné d’un brouillon de réponse.',
  linkLabel: 'Voir tout le produit',
  href: '/produit',
}
