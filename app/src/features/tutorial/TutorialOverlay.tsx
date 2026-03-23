import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from '@/components/motion'
import { Button } from '@/components/ui/Button'
import type { TutorialStep } from '@/features/tutorial/steps'

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

  if (!targetRect || !targetFound) return null

  const slideOffset = getSlideOffset(activePlacement)

  return (
    <div className="fixed inset-0 z-[65]" style={{ pointerEvents: 'none' }}>
      {/* Spotlight cutout */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: targetBorderRadius,
          boxShadow:
            '0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px rgba(212,165,116,0.3)',
          pointerEvents: 'none',
          zIndex: 65,
        }}
        className="border-2 border-primary-light"
      />

      {/* Tooltip */}
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
            zIndex: 65,
          }}
        >
          {/* Chapter name + step counter */}
          <p className="font-label text-primary-light text-xs mb-1">
            {chapterName} &middot; Step {stepIndex + 1} of {totalSteps}
          </p>

          {/* Title */}
          <h3 className="font-heading text-text-heading text-base mb-2">
            {step.title}
          </h3>

          {/* Content */}
          <p className="font-body text-text-body text-sm mb-4 leading-relaxed">
            {step.content}
          </p>

          {/* Button row */}
          <div className="flex items-center gap-2">
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

            <button
              onClick={onDismiss}
              className="ml-auto text-xs text-text-muted hover:text-text-body font-body cursor-pointer transition-colors"
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
