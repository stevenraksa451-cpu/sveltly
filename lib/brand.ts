// lib/brand.ts
// Identité de marque, centralisée. Toutes les pages marketing et la barre de
// navigation lisent ces constantes — renommer le produit se fait donc ici, et
// nulle part ailleurs dans ces pages.
//
// Attention : le reste du projet (interface connectée, emails transactionnels,
// textes légaux) contient encore des occurrences écrites en dur. Elles n'ont
// volontairement pas été touchées : un renommage global se décide, il ne
// s'improvise pas au détour d'un refactor.

export const BRAND_NAME = 'Sveltly'

// "svelto" = agile, en italien. Ce que le produit promet : retrouver de la
// légèreté dans une boîte mail qui déborde.
export const BRAND_TAGLINE = 'Votre boîte mail, allégée.'

export const BRAND_DESCRIPTION =
  'Sveltly trie vos emails, en résume l’essentiel, prépare vos réponses et place vos rendez-vous. Vous gardez la main sur tout.'

export const BRAND_EMAIL = 'support@sveltly.fr'

// Base utilisée pour les métadonnées Open Graph et le sitemap. À ajuster le
// jour où un nom de domaine définitif est branché.
export const SITE_URL = 'https://sveltly.fr'

// Appels à l'action, identiques partout pour que le vocabulaire du produit
// reste constant d'une page à l'autre.
export const CTA_PRIMARY = 'Essayer gratuitement'
export const CTA_PRIMARY_HREF = '/auth/register'
export const CTA_SECONDARY = 'Se connecter'
export const CTA_SECONDARY_HREF = '/auth/login'
export const CTA_NOTE = 'Gratuit · Sans carte bancaire · Gmail'
