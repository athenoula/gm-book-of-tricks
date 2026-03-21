import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from '@/components/motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-inverse hover:bg-primary-light active:bg-primary-dim',
  secondary:
    'bg-bg-raised text-text-body border border-border hover:border-border-hover hover:bg-bg-surface',
  ghost:
    'text-text-secondary hover:text-text-body hover:bg-bg-raised',
  danger:
    'bg-danger-dim text-danger hover:bg-danger/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm max-md:min-h-[44px]',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-[--radius-md] font-medium
        transition-colors duration-[--duration-fast]
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  )
}
