interface Props {
  className?: string
  opacity?: number
}

export function OrnamentalDivider({ className = '', opacity = 0.4 }: Props) {
  return (
    <div className={`flex items-center gap-3 my-8 ${className}`} style={{ opacity }}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary-dim to-transparent" />
      <div className="w-1 h-1 rounded-full bg-primary-dim shrink-0" />
      <div className="w-2 h-2 bg-primary-dim rotate-45 shrink-0" />
      <div className="w-1 h-1 rounded-full bg-primary-dim shrink-0" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary-dim to-transparent" />
    </div>
  )
}
