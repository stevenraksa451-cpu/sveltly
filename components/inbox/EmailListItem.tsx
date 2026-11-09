'use client'
// components/inbox/EmailListItem.tsx
import { memo, useCallback } from 'react'
import { Email } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import SenderAvatar from './SenderAvatar'
import styles from './EmailListItem.module.css'

// memo + onSelect(id) plutôt qu'un onClick déjà fermé sur l'email : la liste
// peut afficher plusieurs centaines d'items, et le poll SWR renvoie un nouveau
// tableau toutes les 4 s tant que l'IA analyse (voir hooks/useEmails.ts). Sans
// memo, chaque poll — et chaque clic, chaque changement de filtre — re-rendait
// la totalité des lignes. Avec une prop `onClick: () => void` recréée à chaque
// rendu du parent, memo n'aurait servi à rien : la fonction change d'identité
// à tous les coups. D'où la signature en (id) + useCallback côté parent.
function EmailListItem({ email, selected, onSelect }: {
  email: Email
  selected: boolean
  onSelect: (id: string) => void
}) {
  const time = new Date(email.receivedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const handleClick = useCallback(() => onSelect(email.id), [onSelect, email.id])

  return (
    <button className={`${styles.item} ${selected ? styles.selected : ''}`} onClick={handleClick}>
      {!email.isRead && <span className={styles.unreadDot} />}
      {/* Logo du domaine de l'expéditeur, repli sur des initiales colorées.
          Remplace un rond indigo uniforme portant les deux premières lettres,
          qui donnait « A- » sur « Aides - CDJ » : le calcul prenait le
          premier caractère de chaque mot, tiret compris. Voir SenderAvatar
          et lib/expediteur.ts. */}
      <SenderAvatar nom={email.sender} adresse={email.senderEmail} taille={34} />
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.sender}>{email.sender}</span>
          <span className={styles.time}>{time}</span>
        </div>
        <p className={styles.subject}>{email.subject}</p>
        <div className={styles.bottomRow}>
          <p className={styles.preview}>{email.preview}</p>
          {(email.priority === 'urgent' || email.priority === 'important') && (
            <PriorityBadge priority={email.priority} size="sm" />
          )}
        </div>
      </div>
    </button>
  )
}

export default memo(EmailListItem)