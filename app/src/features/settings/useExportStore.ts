import { create } from 'zustand'

interface ExportStore {
  status: 'idle' | 'exporting' | 'done' | 'error'
  progress: number
  currentStep: string
  error: string | null
  startExport: () => void
  setProgress: (progress: number, step: string) => void
  finish: () => void
  fail: (error: string) => void
  reset: () => void
}

export const useExportStore = create<ExportStore>((set) => ({
  status: 'idle',
  progress: 0,
  currentStep: '',
  error: null,

  startExport: () => set({
    status: 'exporting',
    progress: 0,
    currentStep: 'Starting export...',
    error: null,
  }),

  setProgress: (progress, step) => set({
    progress,
    currentStep: step,
  }),

  finish: () => set({
    status: 'done',
    progress: 100,
    currentStep: 'Export complete',
  }),

  fail: (error) => set({
    status: 'error',
    error,
    currentStep: 'Export failed',
  }),

  reset: () => set({
    status: 'idle',
    progress: 0,
    currentStep: '',
    error: null,
  }),
}))
