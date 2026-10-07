// lib/ai-usage.ts
// Logique de compteur mensuel partagée entre /api/analyze et
// /api/regenerate-reply (les deux appellent Groq et comptent contre la même
// limite du plan gratuit).
export function resolveMonthlyUsage(profile: { ai_replies_count?: number | null; ai_replies_reset_at?: string | null } | null) {
  const today = new Date()
  const resetAt = profile?.ai_replies_reset_at ? new Date(profile.ai_replies_reset_at) : today
  const isNewMonth = resetAt.getUTCFullYear() !== today.getUTCFullYear() || resetAt.getUTCMonth() !== today.getUTCMonth()
  const currentCount = isNewMonth ? 0 : (profile?.ai_replies_count ?? 0)
  return { today, isNewMonth, currentCount }
}
