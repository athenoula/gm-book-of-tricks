import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/routes/router'
import { queryClient } from '@/lib/query'
import { useAuth } from '@/lib/auth'
import { Toaster } from '@/components/ui/Toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { useCommandPalette } from '@/lib/command-palette'
import { QuickReference } from '@/features/quick-reference/QuickReference'
import { useQuickReference } from '@/lib/quick-reference'
import { CheatSheet } from '@/features/cheat-sheet/CheatSheet'
import { useCheatSheet } from '@/lib/cheat-sheet'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { AmbientEmbers } from '@/components/ui/AmbientEmbers'
import { TutorialProvider } from '@/features/tutorial/TutorialProvider'

export default function App() {
  const { loading, initialize } = useAuth()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useCommandPalette.getState().open()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        useQuickReference.getState().open()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        useCheatSheet.getState().open()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return (
      <>
        <div className="min-h-dvh flex items-center justify-center bg-bg-deep">
          <div className="text-center">
            <div className="text-3xl mb-3 torch-flicker"><GameIcon icon={GiRollingDices} size="3xl" /></div>
            <p className="text-text-muted text-sm">Loading...</p>
          </div>
        </div>
        <AmbientEmbers />
        <div
          className="fixed inset-0 pointer-events-none z-[59]"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            opacity: 0.025,
            mixBlendMode: 'overlay' as const,
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none z-[60]"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
          }}
        />
      </>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <TutorialProvider />
      <Toaster />
      <CommandPalette />
      <QuickReference />
      <CheatSheet />

      {/* Visual atmosphere overlays */}
      <AmbientEmbers />
      <div
        className="fixed inset-0 pointer-events-none z-[59]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          opacity: 0.025,
          mixBlendMode: 'overlay' as const,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-[60]"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
        }}
      />
    </QueryClientProvider>
  )
}
