import { create } from 'zustand'

interface CombatState {
  inCombat: boolean
  round: number
  activeIndex: number
  startCombat: () => void
  nextTurn: (combatantCount: number) => void
  endCombat: () => void
  reset: () => void
}

export const useCombatState = create<CombatState>((set) => ({
  inCombat: false,
  round: 1,
  activeIndex: 0,

  startCombat: () => set({ inCombat: true, round: 1, activeIndex: 0 }),

  nextTurn: (combatantCount: number) =>
    set((state) => {
      const nextIndex = state.activeIndex + 1
      if (nextIndex >= combatantCount) {
        return { activeIndex: 0, round: state.round + 1 }
      }
      return { activeIndex: nextIndex }
    }),

  endCombat: () => set({ inCombat: false }),

  reset: () => set({ inCombat: false, round: 1, activeIndex: 0 }),
}))
