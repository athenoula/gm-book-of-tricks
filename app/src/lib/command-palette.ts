import { create } from 'zustand'

interface CommandPaletteState {
  isOpen: boolean
  query: string
  open: () => void
  close: () => void
  setQuery: (q: string) => void
}

export const useCommandPalette = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: '',
  open: () => set({ isOpen: true, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  setQuery: (query) => set({ query }),
}))
