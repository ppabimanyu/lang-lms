import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

export const isDarkMode = ref<boolean>(getInitialTheme())

export function applyTheme(isDark: boolean) {
  isDarkMode.value = isDark
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }
}

export function toggleTheme() {
  applyTheme(!isDarkMode.value)
}

export function initTheme() {
  if (typeof window === 'undefined') return

  // Apply state to DOM
  applyTheme(isDarkMode.value)

  // Listen to OS prefers-color-scheme changes if no explicit choice is stored
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        applyTheme(e.matches)
      }
    })
  }

  // Cross-tab synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue === 'dark') {
        applyTheme(true)
      } else if (e.newValue === 'light') {
        applyTheme(false)
      }
    }
  })
}
