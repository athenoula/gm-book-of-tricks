import { AnimatePresence, ScaleIn, motion } from '@/components/motion'
import { Button } from '@/components/ui/Button'
import { chapters } from '@/features/tutorial/steps'
import { useTutorial } from '@/lib/tutorial'

interface ChapterPickerProps {
  isOpen: boolean
  onClose: () => void
}

export function ChapterPicker({ isOpen, onClose }: ChapterPickerProps) {
  const completedChapters = useTutorial((s) => s.completedChapters)

  function handleChapterClick(index: number) {
    useTutorial.getState().start(index)
    onClose()
  }

  function handleStartFromBeginning() {
    useTutorial.getState().start(0)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <ScaleIn className="relative w-full max-w-sm mx-4">
            <div className="bg-bg-base border border-border rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-heading text-lg text-text-heading">Tutorial Chapters</h2>
                <p className="font-body text-sm text-text-muted mt-0.5">Choose a chapter to jump to</p>
              </div>

              {/* Chapter list */}
              <div className="py-2">
                {chapters.map((chapter, index) => {
                  const isDone = completedChapters.has(index)
                  return (
                    <button
                      key={index}
                      className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-bg-raised transition-colors"
                      onClick={() => handleChapterClick(index)}
                    >
                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold shrink-0 ${
                          isDone
                            ? 'border-success text-success'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {isDone ? '✓' : index + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-body text-sm text-text-heading block">{chapter.name}</span>
                        <span className="font-body text-xs text-text-muted">{chapter.steps.length} steps</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full" onClick={handleStartFromBeginning}>
                  Start from Beginning
                </Button>
              </div>
            </div>
          </ScaleIn>
        </div>
      )}
    </AnimatePresence>
  )
}
