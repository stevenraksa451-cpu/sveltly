'use client'
// app/settings/personalization/page.tsx
import AppLayout from '@/components/layout/AppLayout'
import Brand from '@/components/ui/Brand'
import { useTheme } from '@/hooks/useTheme'
import styles from '../settings.module.css'
import local from './personalization.module.css'

export default function PersonalizationPage() {
  // changeTheme() applique localement ET persiste en base + dans le cache
  // partagé du profil (voir hooks/useTheme.ts) — rien d'autre à faire ici.
  const { theme, changeTheme: selectTheme } = useTheme()

  return (
    <AppLayout title="Personnalisation" subtitle={<>Ajustez l'apparence de <Brand />.</>}>
      <div className={styles.grid}>
        <div className={styles.card} style={{ cursor: 'default' }}>
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>Thème</h3>
            <p className={styles.cardDesc}>Choisissez l'apparence claire ou sombre de l'interface.</p>

            <div className={local.themeOptions}>
              <button
                className={`${local.themeBtn} ${theme === 'light' ? local.themeBtnActive : ''}`}
                onClick={() => selectTheme('light')}
              >
                <span className={`${local.swatch} ${local.swatchLight}`} />
                Clair
              </button>
              <button
                className={`${local.themeBtn} ${theme === 'dark' ? local.themeBtnActive : ''}`}
                onClick={() => selectTheme('dark')}
              >
                <span className={`${local.swatch} ${local.swatchDark}`} />
                Sombre
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
