import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { useTutorial } from '@/lib/tutorial'
import { chapters } from '@/features/tutorial/steps'
import { TutorialOverlay } from '@/features/tutorial/TutorialOverlay'

const MOBILE_BREAKPOINT = 768
const MOBILE_SKIP_SELECTORS = ['sidebar', 'all-campaigns', 'nav-']
const POLL_INTERVAL_MS = 100
const POLL_TIMEOUT_MS = 3000

function isMobile(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function shouldSkipOnMobile(selector: string): boolean {
  return isMobile() && MOBILE_SKIP_SELECTORS.some((s) => selector.includes(s))
}

function extractCampaignId(): string | null {
  const match = window.location.hash.match(/\/campaign\/([^/]+)/)
  return match?.[1] ?? null
}

function extractSessionId(): string | null {
  const match = window.location.hash.match(/\/session\/([^/]+)/)
  return match?.[1] ?? null
}

export function TutorialProvider() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const {
    isActive,
    currentChapter,
    currentStep,
    hasSeenTutorial,
  } = useTutorial()
  const { start, advanceStep, back, dismiss } = useTutorial()

  const [readyToShow, setReadyToShow] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNavigatingRef = useRef(false)
  const lastPathnameRef = useRef(pathname)

  // Clean up polling
  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  // 1. Auto-trigger on mount
  useEffect(() => {
    if (hasSeenTutorial || !user) return
    const timer = setTimeout(() => {
      start()
    }, 500)
    return () => clearTimeout(timer)
  }, [hasSeenTutorial, user, start])

  // 2. Resolve current step
  const chapter = isActive ? chapters[currentChapter] : null
  const step = chapter?.steps[currentStep] ?? null

  // 3. Auto-advance past mobile-skipped steps
  useEffect(() => {
    if (!isActive || !step) return
    if (shouldSkipOnMobile(step.target)) {
      advanceStep(chapter!.steps.length)
    }
  }, [isActive, step, chapter, currentChapter, currentStep, advanceStep])

  // 4. Route navigation + target polling
  useEffect(() => {
    if (!isActive || !step) return
    // If this step should be skipped on mobile, don't bother with routing/polling
    if (shouldSkipOnMobile(step.target)) return

    setReadyToShow(false)
    clearPolling()

    const resolveRoute = (): string | null => {
      if (!step.route) return null
      let route = step.route
      if (route.includes('$campaignId')) {
        const campaignId = extractCampaignId()
        if (!campaignId) return null
        route = route.replace('$campaignId', campaignId)
      }
      if (route.includes('$sessionId')) {
        const sessionId = extractSessionId()
        if (!sessionId) return null
        route = route.replace('$sessionId', sessionId)
      }
      return route
    }

    const resolvedRoute = resolveRoute()

    // If route needed but can't resolve, skip step
    if (step.route && !resolvedRoute) {
      handleSkipStep()
      return
    }

    const startPolling = () => {
      // Check immediately
      const el = document.querySelector(step.target)
      if (el) {
        setReadyToShow(true)
        return
      }

      // Poll for target element
      const startTime = Date.now()
      pollIntervalRef.current = setInterval(() => {
        const target = document.querySelector(step.target)
        if (target) {
          clearPolling()
          setReadyToShow(true)
        } else if (Date.now() - startTime >= POLL_TIMEOUT_MS) {
          clearPolling()
          handleSkipStep()
        }
      }, POLL_INTERVAL_MS)

      // Safety timeout
      pollTimeoutRef.current = setTimeout(() => {
        clearPolling()
        if (!document.querySelector(step.target)) {
          handleSkipStep()
        }
      }, POLL_TIMEOUT_MS + 100)
    }

    if (resolvedRoute) {
      isNavigatingRef.current = true
      void navigate({ to: resolvedRoute }).then(() => {
        // Let the DOM settle, then reset the navigating flag
        requestAnimationFrame(() => {
          isNavigatingRef.current = false
          startPolling()
        })
      })
    } else {
      startPolling()
    }

    return () => {
      clearPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentChapter, currentStep])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => clearPolling()
  }, [clearPolling])

  // 5. Step advancement
  const handleNext = useCallback(() => {
    if (!chapter) return
    advanceStep(chapter.steps.length)
  }, [chapter, advanceStep])

  // 6. Skip step — uses getState() to avoid stale closures in polling effects
  function handleSkipStep() {
    const state = useTutorial.getState()
    const ch = chapters[state.currentChapter]
    if (!ch) return
    console.warn(
      `[Tutorial] Skipping step: target not found or route unresolvable (chapter ${state.currentChapter}, step ${state.currentStep})`,
    )
    state.advanceStep(ch.steps.length)
  }

  // 7. Keyboard handling
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          back()
          break
        case 'Escape':
          e.preventDefault()
          dismiss()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleNext, back, dismiss])

  // 8. Route change detection — dismiss if user navigates away unexpectedly
  useEffect(() => {
    if (!isActive) {
      lastPathnameRef.current = pathname
      return
    }
    // If the tutorial triggered the navigation, don't dismiss
    if (isNavigatingRef.current) {
      lastPathnameRef.current = pathname
      return
    }
    // If pathname changed and it wasn't us, dismiss
    if (pathname !== lastPathnameRef.current) {
      dismiss()
    }
    lastPathnameRef.current = pathname
  }, [pathname, isActive, dismiss])

  // 9. Render
  if (!isActive || !step || !chapter || !readyToShow) return null

  return (
    <TutorialOverlay
      step={step}
      chapterName={chapter.name}
      stepIndex={currentStep}
      totalSteps={chapter.steps.length}
      chapterIndex={currentChapter}
      totalChapters={chapters.length}
      onNext={handleNext}
      onBack={back}
      onDismiss={dismiss}
      onSkipStep={handleSkipStep}
    />
  )
}
