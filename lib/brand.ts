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

// ⚠️ LE DOMAINE N'EST ÉCRIT QUE DANS CE FICHIER.
//
// Il valait `sveltly.fr` tant qu'aucun domaine n'était acheté. Le domaine
// réel est `sveltly.com` depuis le 8 novembre 2026.
//
// Ces trois constantes sont la source unique : SITE_URL alimente les balises
// canoniques, l'Open Graph, le JSON-LD, le sitemap et le robots.txt ;
// BRAND_EMAIL et PRIVACY_EMAIL alimentent l'aide, les réglages, la
// facturation et les deux pages légales.
//
// Les URL de redirection OAuth, elles, ne sont PAS ici : elles se déduisent
// de `req.nextUrl.origin` (routes serveur) et de `window.location.origin`
// (pages d'authentification), donc elles suivent le domaine qui sert
// réellement l'application. Il n'y a qu'à les déclarer côté Google.
export const BRAND_EMAIL = 'support@sveltly.com'

// Adresse dédiée aux demandes RGPD (accès, rectification, effacement,
// portabilité). Distincte du support, et c'est volontaire : une demande
// d'exercice de droits a un délai légal d'un mois, elle ne doit pas se perdre
// dans la file du support. Elle était écrite en dur dans trois fichiers,
// donc invisible depuis ici le jour d'un changement de domaine.
export const PRIVACY_EMAIL = 'privacy@sveltly.com'

export const SITE_URL = 'https://sveltly.com'

// Appels à l'action, identiques partout pour que le vocabulaire du produit
// reste constant d'une page à l'autre.
export const CTA_PRIMARY = 'Essayer gratuitement'
export const CTA_PRIMARY_HREF = '/auth/register'
export const CTA_SECONDARY = 'Se connecter'
export const CTA_SECONDARY_HREF = '/auth/login'
export const CTA_NOTE = 'Gratuit · Gmail'

// Comptes de la marque sur les réseaux. URL vides tant que les comptes
// n'existent pas : une icône sans URL s'affiche mais ne crée AUCUN lien
// (voir components/landing/nav/SocialLinks.tsx). On évite ainsi de livrer
// quatre liens morts en attendant — il suffira de remplir ces quatre
// chaînes, ici et nulle part ailleurs, pour qu'elles deviennent cliquables.
export const SOCIAL_LINKS: { name: string; url: string }[] = [
  { name: 'X', url: '' },
  { name: 'Instagram', url: '' },
  { name: 'TikTok', url: '' },
  { name: 'Facebook', url: '' },
]
