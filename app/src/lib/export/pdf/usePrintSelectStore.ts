import { create } from 'zustand'

type ContentType = 'monster' | 'spell' | 'character' | 'location'
type PdfTheme = 'themed' | 'clean'

interface PrintSelectStore {
  active: boolean
  selectedIds: Set<string>
  contentType: ContentType
  theme: PdfTheme
  enterSelectMode: (contentType: ContentType) => void
  exitSelectMode: () => void
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setTheme: (theme: PdfTheme) => void
}

export const usePrintSelectStore = create<PrintSelectStore>((set) => ({
  active: false,
  selectedIds: new Set<string>(),
  contentType: 'monster',
  theme: 'themed',

  enterSelectMode: (contentType) => set({
    active: true,
    contentType,
    selectedIds: new Set<string>(),
  }),

  exitSelectMode: () => set({
    active: false,
    selectedIds: new Set<string>(),
  }),

  toggle: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { selectedIds: next }
  }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set<string>() }),
  setTheme: (theme) => set({ theme }),
}))
