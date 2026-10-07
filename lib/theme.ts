export type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'sveltly-theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'light'
}

export function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

// Applique le thème sur <html>. Ne doit être appelé que depuis l'espace connecté
// ((app)/*) : la landing, l'auth et l'onboarding doivent toujours rester en clair.
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', resolveIsDark(theme) ? 'dark' : 'light')
}

// Réinitialise le thème en clair. À appeler en quittant l'espace connecté pour
// éviter qu'un thème sombre choisi dans l'app ne "fuite" sur la landing page.
export function resetTheme() {
  document.documentElement.setAttribute('data-theme', 'light')
}
