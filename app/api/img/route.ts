// app/api/img/route.ts
// Relais d'images pour le lecteur d'emails.
//
// POURQUOI UN RELAIS
// Une image distante dans un email est un mouchard : en la chargeant, le
// navigateur révèle à l'expéditeur l'adresse IP du destinataire, son fuseau,
// son navigateur, et l'HEURE EXACTE de l'ouverture. C'est la technique du
// pixel de suivi, et elle est universelle dans l'emailing commercial.
//
// Passer par le serveur coupe ce lien : l'expéditeur voit l'adresse de
// l'hébergeur, jamais celle de l'utilisateur, et ne peut plus distinguer
// deux lecteurs l'un de l'autre.
//
// ⚠️ UN RELAIS EST UNE SURFACE D'ATTAQUE (SSRF)
// Une route qui va chercher une URL fournie par le client peut être
// détournée pour atteindre ce que le SERVEUR voit et que l'internet ne voit
// pas : les métadonnées de l'hébergeur (169.254.169.254), un service interne,
// une base sur localhost. Les garde-fous ci-dessous sont donc la raison
// d'être du fichier autant que le relais lui-même :
//
//   · https uniquement, jamais http, file, data, gopher…
//   · l'hôte est RÉSOLU et son IP vérifiée — un nom public peut pointer vers
//     127.0.0.1 ou 10.x (attaque « DNS rebinding » dans sa forme simple) ;
//   · aucune redirection suivie automatiquement : chaque saut est revérifié ;
//   · seules les réponses `image/*` ressortent, pour que le relais ne puisse
//     pas servir de tunnel vers du HTML ou du JSON interne ;
//   · taille et délai plafonnés.
//
// La route est volontairement SANS authentification : elle est appelée depuis
// l'iframe du corps d'email, qui est en bac à sable et ne peut pas poser
// d'en-tête Authorization. C'est précisément pour ça que les garde-fous
// ci-dessus ne sont pas négociables — ils sont la seule barrière.
import type { NextRequest } from 'next/server'
import dns from 'node:dns/promises'
import net from 'node:net'
import { routeJson } from '@/lib/api-handler'

// Node, pas Edge : on a besoin de dns.lookup pour vérifier l'IP réelle.
export const runtime = 'nodejs'

const TAILLE_MAX = 5 * 1024 * 1024 // 5 Mo — au-delà, ce n'est plus une image d'email
const DELAI_MS = 8000
const SAUTS_MAX = 2

/** Vrai si l'IP appartient à une plage que l'internet public n'atteint pas. */
function ipPrivee(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // métadonnées des hébergeurs
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast et réservé
    return false
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true
    if (v.startsWith('fc') || v.startsWith('fd')) return true // unique local
    if (v.startsWith('fe80')) return true // lien-local
    // IPv4 encapsulée : ::ffff:127.0.0.1
    const m = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
    if (m) return ipPrivee(m[1])
    return false
  }
  return true // ni v4 ni v6 : on refuse
}

/** Valide une URL et vérifie que TOUTES ses IP sont publiques. */
async function urlSure(brut: string): Promise<URL | null> {
  let u: URL
  try { u = new URL(brut) } catch { return null }
  if (u.protocol !== 'https:') return null
  if (!u.hostname || u.hostname.endsWith('.localhost')) return null

  // Si l'hôte EST déjà une IP, on la teste directement — dns.lookup la
  // renverrait telle quelle, mais autant être explicite.
  if (net.isIP(u.hostname)) return ipPrivee(u.hostname) ? null : u

  let adresses
  try {
    adresses = await dns.lookup(u.hostname, { all: true })
  } catch {
    return null
  }
  if (adresses.length === 0) return null
  // TOUTES doivent être publiques : un nom qui résout vers une IP publique
  // et une privée serait exploitable au second essai.
  if (adresses.some(a => ipPrivee(a.address))) return null
  return u
}

async function GETInterne(req: NextRequest) {
  const demande = req.nextUrl.searchParams.get('u')
  if (!demande) return new Response('Paramètre « u » manquant', { status: 400 })

  let cible = await urlSure(demande)
  if (!cible) return new Response('URL refusée', { status: 400 })

  let reponse: Response | null = null
  for (let saut = 0; saut <= SAUTS_MAX; saut++) {
    const stop = AbortSignal.timeout(DELAI_MS)
    const r = await fetch(cible, {
      redirect: 'manual',
      signal: stop,
      headers: {
        // Aucun cookie, aucun référent : l'expéditeur ne doit rien apprendre
        // de l'utilisateur, pas même quelle page a demandé l'image.
        'User-Agent': 'Sveltly-Image-Proxy',
        Accept: 'image/*',
      },
    }).catch(() => null)
    if (!r) return new Response('Image injoignable', { status: 502 })

    if (r.status >= 300 && r.status < 400) {
      const suite = r.headers.get('location')
      if (!suite || saut === SAUTS_MAX) return new Response('Trop de redirections', { status: 502 })
      // ⚠️ Chaque saut est revalidé : une redirection vers 127.0.0.1 est
      // exactement le contournement que la vérification initiale viserait à
      // côté si on suivait les redirections en aveugle.
      const prochaine = await urlSure(new URL(suite, cible).toString())
      if (!prochaine) return new Response('Redirection refusée', { status: 400 })
      cible = prochaine
      continue
    }
    reponse = r
    break
  }
  if (!reponse) return new Response('Image injoignable', { status: 502 })
  if (!reponse.ok) return new Response('Image indisponible', { status: 502 })

  const type = (reponse.headers.get('content-type') || '').toLowerCase()
  if (!type.startsWith('image/')) {
    return new Response('Ce n’est pas une image', { status: 415 })
  }

  const annonce = Number(reponse.headers.get('content-length') || 0)
  if (annonce > TAILLE_MAX) return new Response('Image trop lourde', { status: 413 })

  const octets = await reponse.arrayBuffer()
  // Le `content-length` peut mentir ou manquer : on revérifie sur le réel.
  if (octets.byteLength > TAILLE_MAX) return new Response('Image trop lourde', { status: 413 })

  return new Response(octets, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(octets.byteLength),
      // Mise en cache longue : une image d'email ne change pas, et chaque
      // requête évitée est un aller-retour de moins par notre serveur.
      'Cache-Control': 'public, max-age=86400, immutable',
      // `nosniff` est déjà posé globalement (next.config.js) ; répété ici
      // parce que cette route sert du contenu VENU DE L'EXTÉRIEUR, et que
      // c'est le seul endroit du projet dans ce cas.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}

export const GET = routeJson(GETInterne)
