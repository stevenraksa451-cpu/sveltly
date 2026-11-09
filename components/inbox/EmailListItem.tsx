'use client'
// components/inbox/EmailListItem.tsx
import { memo, useCallback } from 'react'
import { Email } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import SenderAvatar from './SenderAvatar'
import { dateCourte, nettoyerApercu } from '@/lib/expediteur'
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
  // Initiales, couleur, date et aperçu : toute la logique est dans
  // lib/expediteur.ts, qui est testé. Ici il ne reste que du rendu.
  const time = dateCourte(email.receivedAt)
  const apercu = nettoyerApercu(email.preview)
  const handleClick = useCallback(() => onSelect(email.id), [onSelect, email.id])

  return (
    <button className={`${styles.item} ${selected ? styles.selected : ''}`} onClick={handleClick}>
      {!email.isRead && <span className={styles.unreadDot} />}
      <SenderAvatar nom={email.sender} adresse={email.senderEmail} taille={32} />
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={`${styles.sender} ${!email.isRead ? styles.senderUnread : ''}`}>{email.sender}</span>
          <span className={styles.time}>{time}</span>
        </div>
        <p className={`${styles.subject} ${!email.isRead ? styles.subjectUnread : ''}`}>{email.subject}</p>
        <div className={styles.bottomRow}>
          {/* L'aperçu nettoyé peut être VIDE — un email qui n'est qu'une
              image, ou dont le snippet n'était que des parasites. On ne rend
              alors rien plutôt qu'une ligne fantôme : PriorityBadge garde sa
              place grâce au `justify-content` du conteneur. */}
          {apercu && <p className={styles.preview}>{apercu}</p>}
          <PriorityBadge priority={email.priority} size="sm" />
        </div>
      </div>
    </button>
  )
}

export default memo(EmailListItem)
