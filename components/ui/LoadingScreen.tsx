'use client'
// components/ui/Loader.tsx
import Logo from './Logo'
import styles from './Loader.module.css'

interface LoaderProps {
  fullScreen?: boolean
  size?: number
  label?: string
}

export default function Loader({ fullScreen = true, size = 56, label }: LoaderProps) {
  const ringSize = size * 2.2

  return (
    <div className={fullScreen ? styles.fullScreen : styles.inline}>
      <div className={styles.spinnerWrap} style={{ width: ringSize, height: ringSize }}>
        <div className={styles.ring} />
        <div className={styles.logoWrap}>
          <Logo size={size} showText={false} />
        </div>
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  )
}
