import { create } from 'zustand'
import { chapters } from '@/features/tutorial/steps'

const STORAGE_KEY_SEEN = 'gm-bot-tutorial-seen'
const STORAGE_KEY_COMPLETED = 'gm-bot-tutorial-completed-v2'

function loadSeen(): boolean {
  return localStorage.getItem(STORAGE_KEY_SEEN) === 'true'
}

function loadCompleted(): number[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLETED) || '[]')
  } catch {
    return []
  }
}

interface TutorialState {
  isActive: boolean
  currentChapter: number
  currentStep: number
  completedChapters: Set<number>
  hasSeenTutorial: boolean

  prefillData: Record<string, unknown> | null
  tutorialCampaignId: string | null
  tutorialSessionId: string | null
  stepMode: 'highlight' | 'create' | 'acknowledge' | null
  acknowledgeName: string | null

  start: (chapter?: number) => void
  advanceStep: (chapterLength: number) => void
  back: () => void
  skipChapter: () => void
  dismiss: () => void

  setPrefillData: (data: Record<string, unknown> | null) => void
  setTutorialCampaignId: (id: string | null) => void
  setTutorialSessionId: (id: string | null) => void
  setStepMode: (mode: 'highlight' | 'create' | 'acknowledge' | null) => void
  setAcknowledgeName: (name: string | null) => void
}

export const useTutorial = create<TutorialState>((set, get) => ({
  isActive: false,
  currentChapter: 0,
  currentStep: 0,
  completedChapters: new Set(loadCompleted()),
  hasSeenTutorial: loadSeen(),
  prefillData: null,
  tutorialCampaignId: null,
  tutorialSessionId: null,
  stepMode: null,
  acknowledgeName: null,

  start: (chapter = 0) => set({
    isActive: true,
    currentChapter: chapter,
    currentStep: 0,
  }),

  advanceStep: (chapterLength: number) => {
    const { currentChapter, currentStep, completedChapters } = get()
    if (currentStep < chapterLength - 1) {
      set({ currentStep: currentStep + 1 })
    } else {
      // Chapter complete — advance or dismiss
      const newCompleted = new Set(completedChapters)
      newCompleted.add(currentChapter)
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...newCompleted]))

      if (currentChapter < chapters.length - 1) {
        set({
          currentChapter: currentChapter + 1,
          currentStep: 0,
          completedChapters: newCompleted,
        })
      } else {
        localStorage.setItem(STORAGE_KEY_SEEN, 'true')
        set({
          isActive: false,
          completedChapters: newCompleted,
          hasSeenTutorial: true,
        })
      }
    }
  },

  back: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  skipChapter: () => {
    const { currentChapter, completedChapters } = get()
    const newCompleted = new Set(completedChapters)
    newCompleted.add(currentChapter)
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...newCompleted]))

    if (currentChapter < chapters.length - 1) {
      set({
        currentChapter: currentChapter + 1,
        currentStep: 0,
        completedChapters: newCompleted,
      })
    } else {
      // Last chapter — dismiss
      localStorage.setItem(STORAGE_KEY_SEEN, 'true')
      set({
        isActive: false,
        completedChapters: newCompleted,
        hasSeenTutorial: true,
      })
    }
  },

  dismiss: () => {
    localStorage.setItem(STORAGE_KEY_SEEN, 'true')
    set({ isActive: false, hasSeenTutorial: true })
  },

  setPrefillData: (data) => set({ prefillData: data }),
  setTutorialCampaignId: (id) => set({ tutorialCampaignId: id }),
  setTutorialSessionId: (id) => set({ tutorialSessionId: id }),
  setStepMode: (mode) => set({ stepMode: mode }),
  setAcknowledgeName: (name) => set({ acknowledgeName: name }),
}))
