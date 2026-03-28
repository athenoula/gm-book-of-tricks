import { create } from 'zustand'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeStore {
  preference: ThemePreference
  resolved: ResolvedTheme
  toggle: () => void
  setPreference: (pref: ThemePreference) => void
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

const stored = localStorage.getItem('bot-theme') as ThemePreference | null
const initialPref: ThemePreference = stored === 'light' || stored === 'dark' || stored === 'system'
  ? stored
  : 'system'

export const useTheme = create<ThemeStore>((set, get) => ({
  preference: initialPref,
  resolved: resolve(initialPref),

  toggle: () => {
    const next: ResolvedTheme = get().resolved === 'dark' ? 'light' : 'dark'
    localStorage.setItem('bot-theme', next)
    applyTheme(next)
    set({ preference: next, resolved: next })
  },

  setPreference: (pref) => {
    const resolved = resolve(pref)
    localStorage.setItem('bot-theme', pref)
    applyTheme(resolved)
    set({ preference: pref, resolved })
  },
}))

// Apply on load
applyTheme(useTheme.getState().resolved)

// Listen for OS theme changes (only matters when preference is 'system')
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { preference } = useTheme.getState()
  if (preference === 'system') {
    const resolved = getSystemTheme()
    applyTheme(resolved)
    useTheme.setState({ resolved })
  }
})
