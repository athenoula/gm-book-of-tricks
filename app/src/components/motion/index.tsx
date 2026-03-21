import { type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

const EASE_OUT = [0.16, 1, 0.3, 1]

interface MotionProps {
  children: ReactNode
  className?: string
  duration?: number
  delay?: number
}

export function FadeIn({ children, className, duration = 0.2, delay = 0 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration, delay, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

export function SlideUp({ children, className, duration = 0.2, delay = 0 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

export function ScaleIn({ children, className, duration = 0.2 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
}

export function StaggerList({ children, className, staggerDelay }: MotionProps & { staggerDelay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  const container = staggerDelay
    ? { ...staggerContainer, visible: { transition: { staggerChildren: staggerDelay } } }
    : staggerContainer
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="visible">
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const reduced = useReducedMotion()
  if (reduced) return <div>{children}</div>
  return (
    <AnimatePresence mode="wait">
      <motion.div key={routeKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export { AnimatePresence, motion }
