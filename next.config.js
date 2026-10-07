// next.config.js
const isProd = process.env.NODE_ENV === 'production'

// CSP stricte en production seulement — en dev, le HMR/React Refresh de
// Next.js a besoin de 'unsafe-eval', qu'on ne veut surtout pas livrer en
// prod. 'unsafe-inline' sur script-src reste nécessaire pour le petit script
// anti-flash du thème dans app/layout.tsx (statique, jamais de données
// utilisateur injectées dedans) — le retirer demanderait un système de nonce
// par requête via middleware, hors scope de ce durcissement ponctuel.
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://lh3.googleusercontent.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
  "frame-src 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  'upgrade-insecure-requests',
].join('; ')

// Appliquées à TOUTES les réponses, y compris les routes API — un
// utilisateur authentifié dont les requêtes passeraient par une page piégée
// (clickjacking, sniffing de type MIME) doit être protégé sur l'ensemble du
// site, pas seulement les pages HTML.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: CSP_PROD }] : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // avatars Google OAuth
      { protocol: 'https', hostname: 'images.unsplash.com' }, // photos de la landing
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
