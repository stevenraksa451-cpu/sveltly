// lib/token-crypto.ts
// Chiffrement au repos des tokens OAuth Gmail (access_token/refresh_token de
// public.mailboxes). Jusqu'ici stockés en clair — seule la RLS protégeait
// l'accès. AES-256-GCM avec une clé qui ne vit que côté serveur (jamais dans
// le schéma, jamais envoyée au client).
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY manquante dans les variables d\'environnement')
  const key = Buffer.from(secret, 'base64')
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64')
  return key
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

// Tolère les valeurs déjà en clair (migration progressive : tout ce qui a été
// stocké avant ce correctif) — si le déchiffrement échoue, on renvoie la
// valeur telle quelle plutôt que de casser la connexion Gmail de l'utilisateur.
// N'UTILISE JAMAIS cette fonction pour vérifier l'authenticité d'une valeur
// (ex: un state OAuth) : son fallback "renvoie tel quel" accepterait une
// valeur forgée en clair sans jamais tenter de la déchiffrer. Pour ce cas,
// utilise decryptStrict ci-dessous.
export function decryptToken(value: string | null): string | null {
  if (!value) return value
  const parts = value.split('.')
  if (parts.length !== 3) return value

  const [ivB64, authTagB64, ciphertextB64] = parts
  try {
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return value
  }
}

// Déchiffrement strict, sans fallback clair — pour des valeurs qui doivent
// être vérifiées comme authentiques (ex: state signé d'un flux OAuth).
// Retourne null si la valeur n'est pas un texte chiffré valide par cette clé,
// plutôt que de la traiter comme du texte en clair de confiance.
export function decryptStrict(value: string): string | null {
  const parts = value.split('.')
  if (parts.length !== 3) return null

  const [ivB64, authTagB64, ciphertextB64] = parts
  try {
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return null
  }
}
