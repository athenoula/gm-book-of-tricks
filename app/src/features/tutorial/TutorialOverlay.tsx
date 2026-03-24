import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from '@/components/motion'
import { Button } from '@/components/ui/Button'
import { useTutorial } from '@/lib/tutorial'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { TutorialStep } from '@/features/tutorial/steps'

function renderAcknowledgment(template: string, name: string): React.ReactNode {
  const parts = template.split(/\*\*([^*]+)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-primary-light">{part.replace('{name}', name)}</strong> : part.replace('{name}', name)
  )
}

interface TutorialOverlayProps {
  step: TutorialStep
  chapterName: string
  stepIndex: number
  totalSteps: number
  chapterIndex: number
  totalChapters: number
  onNext: () => void
  onBack: () => void
  onDismiss: () => void
  onSkipStep: () => void
}

type Placement = TutorialStep['placement']

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const TOOLTIP_GAP = 12
const TOOLTIP_VIEWPORT_PADDING = 16

function getOppositePlace(p: Placement): Placement {
  const map: Record<Placement, Placement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }
  return map[p]
}

function getSlideOffset(placement: Placement): { x: number; y: number } {
  switch (placement) {
    case 'top':
      return { x: 0, y: 8 }
    case 'bottom':
      return { x: 0, y: -8 }
    case 'left':
      return { x: 8, y: 0 }
    case 'right':
      return { x: -8, y: 0 }
  }
}

function findScrollableAncestor(el: Element): Element | null {
  let current = el.parentElement
  while (current) {
    const style = getComputedStyle(current)
    const overflow = style.overflow + style.overflowX + style.overflowY
    if (/auto|scroll/.test(overflow)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function enforceMobilePlacement(placement: Placement): Placement {
  if (window.innerWidth < 768 && (placement === 'left' || placement === 'right')) {
    return 'bottom'
  }
  return placement
}

function calcTooltipPosition(
  targetRect: Rect,
  tooltipEl: HTMLDivElement,
  placement: Placement,
): { top: number; left: number; finalPlacement: Placement } {
  const tRect = tooltipEl.getBoundingClientRect()
  const tw = tRect.width
  const th = tRect.height
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = 0
  let left = 0

  const computePos = (p: Placement) => {
    switch (p) {
      case 'top':
        top = targetRect.top - th - TOOLTIP_GAP
        left = targetRect.left + targetRect.width / 2 - tw / 2
        break
      case 'bottom':
        top = targetRect.top + targetRect.height + TOOLTIP_GAP
        left = targetRect.left + targetRect.width / 2 - tw / 2
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - th / 2
        left = targetRect.left - tw - TOOLTIP_GAP
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - th / 2
        left = targetRect.left + targetRect.width + TOOLTIP_GAP
        break
    }
  }

  computePos(placement)

  // Check if tooltip overflows viewport; if so, flip
  const overflows =
    top < TOOLTIP_VIEWPORT_PADDING ||
    top + th > vh - TOOLTIP_VIEWPORT_PADDING ||
    left < TOOLTIP_VIEWPORT_PADDING ||
    left + tw > vw - TOOLTIP_VIEWPORT_PADDING

  let finalPlacement = placement
  if (overflows) {
    finalPlacement = getOppositePlace(placement)
    computePos(finalPlacement)
  }

  // Clamp to viewport bounds regardless
  top = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(top, vh - th - TOOLTIP_VIEWPORT_PADDING))
  left = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(left, vw - tw - TOOLTIP_VIEWPORT_PADDING))

  return { top, left, finalPlacement }
}

export function TutorialOverlay({
  step,
  chapterName,
  stepIndex,
  totalSteps,
  chapterIndex,
  totalChapters,
  onNext,
  onBack,
  onDismiss,
  onSkipStep,
}: TutorialOverlayProps) {
  const { stepMode, acknowledgeName } = useTutorial()
  const isMobile = useIsMobile()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [targetBorderRadius, setTargetBorderRadius] = useState('0px')
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)
  const [activePlacement, setActivePlacement] = useState<Placement>(step.placement)
  const [targetFound, setTargetFound] = useState(true)

  const isLastChapter = chapterIndex === totalChapters - 1
  const isLastStep = stepIndex === totalSteps - 1
  const isFinish = isLastChapter && isLastStep

  const updatePosition = useCallback(() => {
    const target = document.querySelector(step.target)
    if (!target) {
      console.warn(`[Tutorial] Target not found: ${step.target}`)
      setTargetFound(false)
      return
    }
    setTargetFound(true)

    const rect = target.getBoundingClientRect()
    const newRect: Rect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
    setTargetRect(newRect)
    setTargetBorderRadius(getComputedStyle(target).borderRadius)

    if (tooltipRef.current) {
      const mobilePlacement = enforceMobilePlacement(step.placement)
      const { top, left, finalPlacement } = calcTooltipPosition(
        newRect,
        tooltipRef.current,
        mobilePlacement,
      )
      setTooltipPos({ top, left })
      setActivePlacement(finalPlacement)
    }
  }, [step.target, step.placement])

  // Skip step if target not found
  useEffect(() => {
    if (!targetFound) {
      onSkipStep()
    }
  }, [targetFound, onSkipStep])

  // Initial position calculation
  useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition])

  // Recalculate after tooltip renders (need its dimensions)
  useEffect(() => {
    // Small delay to let tooltip render so we can measure it
    const frame = requestAnimationFrame(() => {
      updatePosition()
    })
    return () => cancelAnimationFrame(frame)
  }, [updatePosition])

  // ResizeObserver on body + scroll listener on scrollable ancestor
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      updatePosition()
    })
    ro.observe(document.body)

    // Window resize for mobile breakpoint changes
    const onResize = () => updatePosition()
    window.addEventListener('resize', onResize)

    // Find scrollable ancestor and listen for scroll
    const target = document.querySelector(step.target)
    let scrollAncestor: Element | null = null
    if (target) {
      scrollAncestor = findScrollableAncestor(target)
    }

    const onScroll = () => updatePosition()
    if (scrollAncestor) {
      scrollAncestor.addEventListener('scroll', onScroll, { passive: true })
    }
    // Also listen on window scroll
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      if (scrollAncestor) {
        scrollAncestor.removeEventListener('scroll', onScroll)
      }
    }
  }, [step.target, updatePosition])

  // Acknowledge mode: centered overlay (desktop) or bottom bar (mobile)
  if (stepMode === 'acknowledge') {
    const ackContent = step.acknowledgment
      ? renderAcknowledgment(step.acknowledgment, acknowledgeName ?? '')
      : step.content

    if (isMobile) {
      return (
        <div className="fixed inset-0 z-[65]" style={{ pointerEvents: 'none' }}>
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}
          />
          <motion.div
            key={`acknowledge-mobile-${stepIndex}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-0 right-0 bg-bg-base border-t border-primary-light px-4 py-3"
            style={{ bottom: 74, pointerEvents: 'auto', zIndex: 65 }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-heading text-text-heading text-sm">{step.title}</h3>
              <span className="font-label text-primary-light text-xs">{chapterName}</span>
            </div>
            <p className="font-body text-text-body text-xs leading-relaxed mb-2">{ackContent}</p>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={onNext}>Continue</Button>
            </div>
          </motion.div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-[65]" style={{ pointerEvents: 'none' }}>
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={`acknowledge-${stepIndex}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-bg-base border border-primary-light rounded-[--radius-lg] shadow-lg"
            style={{
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: 400,
              minWidth: 280,
              padding: '24px 28px',
              pointerEvents: 'auto',
              zIndex: 65,
            }}
          >
            <p className="font-label text-primary-light text-xs mb-1">{chapterName}</p>
            <h3 className="font-heading text-text-heading text-base mb-3">{step.title}</h3>
            <p className="font-body text-text-body text-sm mb-5 leading-relaxed">{ackContent}</p>
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={onNext}>Continue</Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (!targetRect || !targetFound) return null

  const slideOffset = getSlideOffset(activePlacement)
  const isCreateMode = stepMode === 'create'
  const zClass = isCreateMode ? 'z-[45]' : 'z-[65]'
  const zValue = isCreateMode ? 45 : 65

  // Shared spotlight element
  const spotlight = (
    <div
      style={{
        position: 'fixed',
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: targetBorderRadius,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px rgba(212,165,116,0.3)',
        pointerEvents: isCreateMode ? 'auto' : 'none',
        zIndex: zValue,
      }}
      className="border-2 border-primary-light"
    />
  )

  // Mobile: bottom bar instead of positioned tooltip
  if (isMobile) {
    return (
      <div className={`fixed inset-0 ${zClass}`} style={{ pointerEvents: 'none' }}>
        {spotlight}

        <motion.div
          key={`mobile-bar-${step.target}-${stepIndex}`}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 right-0 bg-bg-base border-t border-primary-light px-4 py-3"
          style={{ bottom: 74, pointerEvents: 'auto', zIndex: zValue }}
        >
          {/* Top row: title + chapter counter */}
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-heading text-text-heading text-sm">{step.title}</h3>
            <span className="font-label text-primary-light text-xs">
              {chapterName} &middot; {stepIndex + 1}/{totalSteps}
            </span>
          </div>

          {/* Description */}
          <p className="font-body text-text-body text-xs leading-relaxed mb-2">
            {step.content}
          </p>

          {/* Button row */}
          <div className="flex items-center gap-2">
            {!isCreateMode && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={stepIndex === 0 && chapterIndex === 0}
                  onClick={onBack}
                >
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={onNext}>
                  {isFinish ? 'Finish' : 'Next'}
                </Button>
              </>
            )}
            <button
              onClick={onDismiss}
              className={`text-xs text-text-muted hover:text-text-body font-body cursor-pointer transition-colors ${isCreateMode ? '' : 'ml-auto'}`}
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Desktop: positioned tooltip
  return (
    <div className={`fixed inset-0 ${zClass}`} style={{ pointerEvents: 'none' }}>
      {spotlight}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${step.target}-${stepIndex}`}
          ref={tooltipRef}
          initial={{ opacity: 0, x: slideOffset.x, y: slideOffset.y }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-bg-base border border-primary-light rounded-[--radius-lg] shadow-lg"
          style={{
            position: 'fixed',
            top: tooltipPos?.top ?? 0,
            left: tooltipPos?.left ?? 0,
            maxWidth: 340,
            minWidth: 260,
            padding: '16px 20px',
            pointerEvents: 'auto',
            zIndex: zValue,
          }}
        >
          <p className="font-label text-primary-light text-xs mb-1">
            {chapterName} &middot; Step {stepIndex + 1} of {totalSteps}
          </p>
          <h3 className="font-heading text-text-heading text-base mb-2">{step.title}</h3>
          <p className="font-body text-text-body text-sm mb-4 leading-relaxed">{step.content}</p>

          {isCreateMode && activePlacement === 'top' && (
            <div className="flex justify-center -mb-2">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary-light" />
            </div>
          )}
          {isCreateMode && activePlacement === 'bottom' && (
            <div className="flex justify-center -mt-6 mb-2">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-primary-light" />
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isCreateMode && (
              <>
                <Button variant="ghost" size="sm" disabled={stepIndex === 0 && chapterIndex === 0} onClick={onBack}>
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={onNext}>
                  {isFinish ? 'Finish' : 'Next'}
                </Button>
              </>
            )}
            <button
              onClick={onDismiss}
              className={`text-xs text-text-muted hover:text-text-body font-body cursor-pointer transition-colors ${isCreateMode ? '' : 'ml-auto'}`}
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
