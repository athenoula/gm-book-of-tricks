// src/features/landing/demos/WebClipperDemo.tsx
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { DemoFrame } from './DemoFrame'

export function WebClipperDemo({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0)
  // 0: show browser content, 1: show clipper icon, 2: clip animation, 3: show inbox

  useEffect(() => {
    if (!isVisible) return
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => setStep(1), 1200))
    timers.push(setTimeout(() => setStep(2), 2400))
    timers.push(setTimeout(() => setStep(3), 3400))

    const loop = setInterval(() => {
      setStep(0)
      timers.push(setTimeout(() => setStep(1), 1200))
      timers.push(setTimeout(() => setStep(2), 2400))
      timers.push(setTimeout(() => setStep(3), 3400))
    }, 9000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(loop)
    }
  }, [isVisible])

  return (
    <DemoFrame>
      <div className="relative">
        {/* Mock browser tab */}
        <div className="rounded-[--radius-sm] border border-border bg-bg-raised/50 mb-3 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-deep/60 border-b border-border">
            <span className="text-[10px] text-text-muted font-[family-name:--font-mono] truncate">
              reddit.com/r/dndnext/homebrew_monsters
            </span>
            <AnimatePresence>
              {step >= 1 && step < 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-auto shrink-0 w-5 h-5 rounded bg-primary/20 border border-primary/30 flex items-center justify-center"
                >
                  <span className="text-[10px] text-primary">✂</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {step < 3 && (
              <motion.div
                className="p-3"
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs text-text-heading font-[family-name:--font-heading] mb-1">
                  Shadow Drake (CR 4)
                </div>
                <div className="text-[11px] text-text-secondary leading-relaxed mb-2">
                  Medium dragon, neutral evil. A sleek, bat-winged drake that dissolves into shadow
                  when threatened...
                </div>
                <div className="flex gap-3 text-[10px] text-text-muted font-[family-name:--font-mono]">
                  <span>AC 15</span>
                  <span>HP 52</span>
                  <span>Speed 40ft, fly 60ft</span>
                </div>

                {/* Clip highlight effect */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-primary/10 rounded-[--radius-sm] pointer-events-none"
                    style={{ top: '28px' }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Campaign inbox */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-[10px] font-[family-name:--font-label] text-text-muted tracking-wider mb-2">
                INSPIRATION BOARD
              </div>
              <div className="p-2.5 rounded-[--radius-sm] border border-success/30 bg-success/5">
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-success">✓</span>
                  </motion.div>
                  <div>
                    <div className="text-xs text-text-heading font-[family-name:--font-heading]">
                      Shadow Drake (CR 4)
                    </div>
                    <div className="text-[10px] text-text-muted">Clipped from reddit.com</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  )
}
