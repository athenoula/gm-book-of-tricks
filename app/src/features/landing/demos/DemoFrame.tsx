// src/features/landing/demos/DemoFrame.tsx
import type { ReactNode } from 'react'

interface DemoFrameProps {
  children: ReactNode
  className?: string
}

export function DemoFrame({ children, className = '' }: DemoFrameProps) {
  return (
    <div
      className={`bg-bg-base/50 border border-border rounded-[--radius-lg] overflow-hidden shadow-lg ${className}`}
    >
      {/* Traffic light dots */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-bg-deep/80 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs text-text-muted font-[family-name:--font-mono]">
          GM Book of Tricks
        </span>
      </div>
      {/* Demo content */}
      <div className="p-4 min-h-[240px] relative overflow-hidden">{children}</div>
    </div>
  )
}
