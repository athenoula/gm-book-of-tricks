import { AnimatePresence, motion } from '@/components/motion'
import { Button } from '@/components/ui/Button'
import { usePrintSelectStore } from '@/lib/export/pdf/usePrintSelectStore'

interface PrintSelectionBarProps {
  onPrint: () => void
}

export function PrintSelectionBar({ onPrint }: PrintSelectionBarProps) {
  const { active, selectedIds, theme, setTheme, exitSelectMode } = usePrintSelectStore()

  const count = selectedIds.size

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-base"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            {/* Left: Count */}
            <div className="text-sm text-text-secondary">
              {count} {count === 1 ? 'item' : 'items'} selected
            </div>

            {/* Center: Theme Toggle */}
            <div className="flex gap-2">
              <Button
                variant={theme === 'themed' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('themed')}
              >
                Themed
              </Button>
              <Button
                variant={theme === 'clean' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('clean')}
              >
                Clean
              </Button>
            </div>

            {/* Right: Print + Cancel */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  exitSelectMode()
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onPrint}
                disabled={count === 0}
              >
                Print {count} {count === 1 ? 'Item' : 'Items'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
