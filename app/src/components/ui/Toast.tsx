import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useToastStore, type Toast as ToastT } from '@/lib/toast'

const icons: Record<ToastT['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const styles: Record<ToastT['type'], string> = {
  success: 'bg-success-dim text-success',
  error: 'bg-danger-dim text-danger',
  info: 'bg-info-dim text-info',
}

function ToastItem({ toast }: { toast: ToastT }) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <motion.div
      layout
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      onClick={() => removeToast(toast.id)}
      className={`max-w-[360px] rounded-[--radius-md] shadow-md px-4 py-3 cursor-pointer flex items-center gap-2 text-[13px] ${styles[toast.type]}`}
    >
      <span className="text-base leading-none">{icons[toast.type]}</span>
      <span>{toast.message}</span>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
