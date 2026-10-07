// components/landing/GlossyBlobs.tsx
// Formes "verre liquide" décoratives en fond du hero — pur CSS (dégradés +
// blur + keyframes), aucune image externe. Purement visuel, aria-hidden.
import styles from './GlossyBlobs.module.css'

export default function GlossyBlobs() {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
    </div>
  )
}
