import { create } from 'zustand'

export type CheatSheetTab = 'skills' | 'conditions' | 'cover' | 'dcs' | 'travel' | 'items'

interface CheatSheetState {
  isOpen: boolean
  activeTab: CheatSheetTab
  open: () => void
  close: () => void
  setTab: (tab: CheatSheetTab) => void
}

export const useCheatSheet = create<CheatSheetState>((set) => ({
  isOpen: false,
  activeTab: 'skills',
  open: () => set({ isOpen: true, activeTab: 'skills' }),
  close: () => set({ isOpen: false }),
  setTab: (activeTab) => set({ activeTab }),
}))
