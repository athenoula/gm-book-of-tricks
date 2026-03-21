import type { IconComponent } from './icons'

type IconSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'

interface GameIconProps {
  icon: IconComponent
  size?: IconSize
  className?: string
  label?: string
}

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 36,
}

export function GameIcon({ icon: Icon, size = 'base', className = '', label }: GameIconProps) {
  return (
    <Icon
      size={SIZE_MAP[size]}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden={!label}
      aria-label={label}
    />
  )
}
