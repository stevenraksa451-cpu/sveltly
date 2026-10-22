// lib/mailbox-quota.ts
// Source unique de la question « cette boîte a-t-elle le droit d'être
// enregistrée ? ».
//
// La règle existait, mais à un seul endroit — /api/mailboxes/callback, le
// chemin « Ajouter une boîte mail » des réglages. Or DEUX autres chemins
// créent une ligne dans `mailboxes`, et ni l'un ni l'autre ne lisait le
// forfait :
//
//   app/auth/callback/route.ts     connexion Google (Supabase renvoie un code)
//   app/api/save-token/route.ts    connexion Google (Supabase renvoie un fragment)
//
// Les deux sont bornés à l'adresse de connexion de l'utilisateur, donc rien
// d'exploitable pour en créer dix. Mais un compte Gratuit qui avait déjà
// ajouté une boîte par les réglages, puis se reconnectait avec Google, se
// retrouvait avec DEUX boîtes là où le forfait en annonce une. La limite
// n'était donc pas 1 dans tous les cas.
//
// ⚠️ Les trois appelants ne réagissent pas pareil à un refus, et c'est
// voulu : dans les réglages, l'utilisateur a demandé à ajouter une boîte et
// doit l'apprendre ; sur un chemin de CONNEXION, il a demandé à se
// connecter — lui refuser l'accès à son compte parce que son forfait
// plafonne les boîtes serait absurde. Cette fonction rend donc un booléen et
// laisse chacun décider.
import { getPlan } from '@/lib/plans'

export async function boiteAutorisee(
  supabase: any,
  userId: string,
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false

  // Une adresse DÉJÀ enregistrée n'est pas un ajout. La reconnecter doit
  // toujours passer, y compris au plafond — c'est le seul moyen de réparer
  // une boîte déconnectée sans payer, et les trois appelants écrivent par
  // upsert sur (user_id, email) : la ligne est remplacée, pas ajoutée.
  const { data: existante } = await supabase
    .from('mailboxes')
    .select('id')
    .eq('user_id', userId)
    .eq('email', email)
    .maybeSingle()

  if (existante) return true

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  const plafond = getPlan(profile?.plan).limits.mailboxes
  if (plafond === null) return true

  const { count } = await supabase
    .from('mailboxes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  return (count ?? 0) < plafond
}
