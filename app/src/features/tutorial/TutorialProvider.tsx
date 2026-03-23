import { useCallback, useEffect, useRef, useState } from 'react'
import { router } from '@/routes/router'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query'
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

function getCurrentHash(): string {
  return window.location.hash
}

async function runExistsCheck(
  entity: 'campaign' | 'session' | 'character',
  userId: string | undefined,
  campaignId: string | null,
): Promise<{ exists: boolean; name?: string; id?: string }> {
  try {
    switch (entity) {
      case 'campaign': {
        if (!userId) return { exists: false }
        const { data } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('gm_id', userId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name, id: data.id } : { exists: false }
      }
      case 'character': {
        if (!campaignId) return { exists: false }
        const { data } = await supabase
          .from('player_characters')
          .select('id, name')
          .eq('campaign_id', campaignId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name } : { exists: false }
      }
      case 'session': {
        if (!campaignId) return { exists: false }
        const { data } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('campaign_id', campaignId)
          .limit(1)
          .single()
        return data ? { exists: true, name: data.name, id: data.id } : { exists: false }
      }
    }
  } catch {
    console.warn(`[Tutorial] existsCheck failed for ${entity}, skipping step`)
    return { exists: true, name: 'existing' }
  }
}

export function TutorialProvider() {
  const { user } = useAuth()

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
  const lastHashRef = useRef(getCurrentHash())
  const cacheUnsubRef = useRef<(() => void) | null>(null)

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

    let cancelled = false
    setReadyToShow(false)
    clearPolling()

    const store = useTutorial.getState()
    store.setPrefillData(null)
    store.setStepMode(null)
    store.setAcknowledgeName(null)
    cacheUnsubRef.current?.()
    cacheUnsubRef.current = null

    const resolveRoute = async (): Promise<string | null> => {
      if (!step.route) return null
      let route = step.route
      if (route.includes('$campaignId')) {
        const campaignId = useTutorial.getState().tutorialCampaignId || extractCampaignId()
        if (!campaignId) return null
        route = route.replace('$campaignId', campaignId)
      }
      if (route.includes('$sessionId')) {
        // Try URL first, then query Supabase for the first session
        let sessionId = useTutorial.getState().tutorialSessionId || extractSessionId()
        if (!sessionId) {
          const campaignId = useTutorial.getState().tutorialCampaignId || extractCampaignId()
          if (campaignId) {
            const { data } = await supabase
              .from('sessions')
              .select('id')
              .eq('campaign_id', campaignId)
              .order('session_number', { ascending: false, nullsFirst: false })
              .limit(1)
              .single()
            sessionId = data?.id ?? null
          }
        }
        if (!sessionId) return null
        route = route.replace('$sessionId', sessionId)
      }
      return route
    }

    const startPolling = () => {
      if (cancelled) return
      // Check immediately
      const el = document.querySelector(step.target)
      if (el) {
        setReadyToShow(true)
        return
      }

      // Poll for target element
      const startTime = Date.now()
      pollIntervalRef.current = setInterval(() => {
        if (cancelled) { clearPolling(); return }
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
        if (!cancelled && !document.querySelector(step.target)) {
          handleSkipStep()
        }
      }, POLL_TIMEOUT_MS + 100)
    }

    void (async () => {
      const resolvedRoute = await resolveRoute()
      if (cancelled) return

      // If route needed but can't resolve, skip step
      if (step.route && !resolvedRoute) {
        handleSkipStep()
        return
      }

      // Handle create steps
      if (step.type === 'create' && step.createEntity) {
        const result = await runExistsCheck(step.createEntity, user?.id, store.tutorialCampaignId)
        if (cancelled) return

        if (result.exists) {
          // Acknowledge mode
          store.setStepMode('acknowledge')
          store.setAcknowledgeName(result.name || '')

          if (step.createEntity === 'campaign' && result.id) {
            store.setTutorialCampaignId(result.id)
          }
          if (step.createEntity === 'session' && result.id) {
            store.setTutorialSessionId(result.id)
          }

          setReadyToShow(true)
          return
        }

        // Create mode — entity doesn't exist
        store.setStepMode('create')
        store.setPrefillData(step.prefill || null)

        // Subscribe to TanStack Query cache for entity creation
        const queryKeyPrefix = step.createEntity === 'campaign'
          ? 'campaigns'
          : step.createEntity === 'character'
            ? 'pcs'
            : 'sessions'

        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
          if (cancelled) return
          if (event.query.queryKey[0] === queryKeyPrefix) {
            // Entity likely created — re-run exists check to confirm
            void runExistsCheck(step.createEntity!, user?.id, useTutorial.getState().tutorialCampaignId).then((recheck) => {
              if (cancelled || !recheck.exists) return

              const s = useTutorial.getState()
              s.setPrefillData(null)
              s.setStepMode(null)

              if (step.createEntity === 'campaign' && recheck.id) {
                s.setTutorialCampaignId(recheck.id)
              }
              if (step.createEntity === 'session' && recheck.id) {
                s.setTutorialSessionId(recheck.id)
              }

              // Advance step
              const ch = chapters[s.currentChapter]
              if (ch) s.advanceStep(ch.steps.length)
            })
          }
        })

        cacheUnsubRef.current = unsubscribe

        // Navigate if needed, then poll for target to show spotlight
        if (resolvedRoute) {
          isNavigatingRef.current = true
          lastHashRef.current = '#' + resolvedRoute
          await router.navigate({ to: resolvedRoute })
          if (cancelled) return
          requestAnimationFrame(() => {
            isNavigatingRef.current = false
            if (!cancelled) startPolling()
          })
        } else {
          startPolling()
        }
        return
      }

      // Existing highlight step logic
      store.setStepMode('highlight')

      if (resolvedRoute) {
        isNavigatingRef.current = true
        lastHashRef.current = '#' + resolvedRoute
        await router.navigate({ to: resolvedRoute })
        if (cancelled) return
        // Let the DOM settle, then reset the navigating flag
        requestAnimationFrame(() => {
          isNavigatingRef.current = false
          if (!cancelled) startPolling()
        })
      } else {
        startPolling()
      }
    })()

    return () => {
      cancelled = true
      clearPolling()
      cacheUnsubRef.current?.()
      cacheUnsubRef.current = null
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
        case 'Enter': {
          const mode = useTutorial.getState().stepMode
          if (mode === 'create') return  // Don't auto-advance in create mode
          e.preventDefault()
          handleNext()
          break
        }
        case 'ArrowLeft': {
          const mode = useTutorial.getState().stepMode
          if (mode === 'create' || mode === 'acknowledge') return
          e.preventDefault()
          back()
          break
        }
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
    if (!isActive) return

    const handleHashChange = () => {
      // If the tutorial triggered the navigation, don't dismiss
      if (isNavigatingRef.current) {
        lastHashRef.current = getCurrentHash()
        return
      }
      // If hash changed and it wasn't us, dismiss
      const currentHash = getCurrentHash()
      if (currentHash !== lastHashRef.current) {
        dismiss()
      }
      lastHashRef.current = currentHash
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isActive, dismiss])

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
