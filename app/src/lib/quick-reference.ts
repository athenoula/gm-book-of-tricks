import { create } from 'zustand'

interface SelectedItem {
  id: string
  type: 'spell' | 'monster' | 'ability' | 'pc' | 'npc' | 'location'
}

interface QuickReferenceState {
  isOpen: boolean
  query: string
  selectedItem: SelectedItem | null
  open: () => void
  close: () => void
  setQuery: (q: string) => void
  selectItem: (item: SelectedItem) => void
}

export const useQuickReference = create<QuickReferenceState>((set) => ({
  isOpen: false,
  query: '',
  selectedItem: null,
  open: () => set({ isOpen: true, query: '', selectedItem: null }),
  close: () => set({ isOpen: false, query: '', selectedItem: null }),
  setQuery: (query) => set({ query }),
  selectItem: (selectedItem) => set({ selectedItem }),
}))
