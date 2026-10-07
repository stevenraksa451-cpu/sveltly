// supabase/functions/daily-digest/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

// Échappe le HTML avant interpolation — sender_name, sender_email et subject
// viennent d'emails REÇUS, donc potentiellement écrits par n'importe quel
// expéditeur externe (non fiable). Sans ça, un expéditeur malveillant pouvait
// mettre un payload XSS dans son nom affiché ou l'objet de son email et le
// faire exécuter dans le client mail de l'utilisateur qui ouvre ce digest.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getLocalHour(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(new Date()), 10) % 24
  } catch {
    return new Date().getUTCHours() // repli si le fuseau est invalide
  }
}

Deno.serve(async (req) => {
  const providedSecret = req.headers.get('x-cron-secret')
  if (providedSecret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email_digest_enabled, timezone, digest_send_hour, urgent_only_notifs')
    .eq('email_digest_enabled', true)

  if (usersError) {
    console.error('Erreur récupération profiles:', usersError)
    return new Response('error', { status: 500 })
  }
  if (!users || users.length === 0) return new Response('ok — aucun utilisateur avec le digest activé')

  let sentCount = 0
  let skippedCount = 0

  for (const user of users) {
    const timezone = user.timezone || 'Europe/Paris'
    const preferredHour = user.digest_send_hour ?? 8
    const currentHour = getLocalHour(timezone)

    // Ce n'est pas l'heure choisie par cet utilisateur — on saute, sans erreur
    if (currentHour !== preferredHour) {
      skippedCount++
      continue
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id)
    if (authError || !authUser?.user?.email) continue

    // "Urgents uniquement" (Réglages > Notifications) dit explicitement
    // "coupe TOUTES les alertes sauf urgentes" — doit donc aussi s'appliquer
    // au digest email, pas seulement aux notifications push (NotificationManager),
    // sinon le réglage de l'utilisateur est silencieusement ignoré pour ce canal.
    let emailsQuery = supabase
      .from('emails')
      .select('sender_name, sender_email, subject, priority')
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (user.urgent_only_notifs) {
      emailsQuery = emailsQuery.eq('priority', 'urgent')
    }
    const { data: emails } = await emailsQuery
      .order('priority', { ascending: false })
      .limit(10)

    if (!emails || emails.length === 0) continue

    const rows = emails
      .map(e => `<li><strong>${escapeHtml(e.sender_name || e.sender_email)}</strong> — ${escapeHtml(e.subject)} <em>(${escapeHtml(e.priority || 'normal')})</em></li>`)
      .join('')

    const { error: sendError } = await resend.emails.send({
      from: 'Sveltly <onboarding@resend.dev>',
      to: authUser.user.email,
      subject: `${emails.length} emails non traités vous attendent`,
      html: `<ul>${rows}</ul><p><a href="https://sveltly.app/inbox">Ouvrir Sveltly</a></p>`,
    })

    if (sendError) {
      console.error(`Erreur envoi pour ${authUser.user.email}:`, sendError)
    } else {
      sentCount++
    }
  }

  return new Response(`ok — ${sentCount} digest(s) envoyé(s), ${skippedCount} pas encore à leur heure`)
})