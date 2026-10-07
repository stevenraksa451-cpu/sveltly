# 🗄️ Guide Backend Supabase — Sveltly

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Donne un nom (ex: `sveltly`), choisis une région proche (ex: **West EU**)
3. Note ton **Project URL** et tes **API Keys** (Settings → API)

---

## 2. Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine de ton projet Next.js :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # Utiliser uniquement côté serveur
```

---

## 3. Exécuter le schéma SQL

1. Dans Supabase → **SQL Editor** → **New query**
2. Copie le contenu de `supabase-schema.sql`
3. Clique **Run**

Cela crée les tables : `profiles`, `mailboxes`, `emails`, `calendar_events`, `reply_history`

---

## 4. Activer l'authentification Google OAuth

1. Supabase → **Authentication** → **Providers** → **Google**
2. Active Google, puis copie le **Callback URL** affiché
3. Va dans [Google Cloud Console](https://console.cloud.google.com) :
   - Crée un projet OAuth
   - Autorise le Callback URL de Supabase
   - Récupère **Client ID** et **Client Secret**
4. Colle-les dans Supabase → Google Provider

---

## 5. Activer l'auth par email

Supabase → **Authentication** → **Providers** → **Email** → ✅ activé par défaut  
Pense à configurer ton **SMTP** (Settings → Auth → SMTP) pour les emails transactionnels.

---

## 6. Structure des tables

| Table             | Description                                      |
|-------------------|--------------------------------------------------|
| `profiles`        | Infos utilisateur (nom, préférences, thème)      |
| `mailboxes`       | Boîtes Gmail/Outlook connectées                  |
| `emails`          | Emails importés + classification IA              |
| `calendar_events` | Événements détectés ou créés manuellement        |
| `reply_history`   | Historique des réponses envoyées                 |

---

## 7. Row Level Security (RLS)

Le schéma active automatiquement le **RLS** sur toutes les tables.  
Chaque utilisateur ne peut accéder qu'à **ses propres données**. Aucune donnée n'est accessible sans être connecté.

---

## 8. Intégration Gmail (OAuth 2.0)

Pour connecter Gmail :

1. **Google Cloud Console** → Activer **Gmail API**
2. Créer des identifiants OAuth 2.0
3. Scopes nécessaires :
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
4. Stocker les `access_token` / `refresh_token` dans `mailboxes` (chiffrés)

---

## 9. Intégration IA (OpenAI)

Pour générer les réponses automatiques :

1. Ajoute `OPENAI_API_KEY` dans `.env.local`
2. Crée une **API Route** Next.js : `app/api/generate-reply/route.ts`

```ts
// app/api/generate-reply/route.ts
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { emailBody, tone } = await req.json()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant professionnel pour micro-entreprises. Génère une réponse email courte, ${tone}, en français.`
      },
      { role: 'user', content: `Email reçu :\n\n${emailBody}\n\nRédige une réponse.` }
    ],
    max_tokens: 300
  })

  return NextResponse.json({ reply: completion.choices[0].message.content })
}
```

---

## 10. Déploiement (Vercel)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ajouter les variables d'environnement
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
```

---

## Résumé des commandes

```bash
# Installation
npm install

# Développement local
npm run dev

# Build production
npm run build
```
