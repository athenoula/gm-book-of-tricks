import { useRef } from 'react'
import { GameIcon } from './GameIcon'
import type { IconComponent } from './icons'

type PortraitSize = 'sm' | 'md' | 'lg'

interface PortraitFrameProps {
  imageUrl?: string | null
  fallbackIcon: IconComponent
  size?: PortraitSize
  uploading?: boolean
  onUpload?: (file: File) => void
  className?: string
}

const SIZE_MAP: Record<PortraitSize, { container: string; icon: 'sm' | 'lg' | 'xl' | '2xl' }> = {
  sm: { container: 'w-10 h-10', icon: 'lg' },
  md: { container: 'w-20 h-20', icon: 'xl' },
  lg: { container: 'w-[120px] h-[120px]', icon: '2xl' },
}

export function PortraitFrame({
  imageUrl,
  fallbackIcon,
  size = 'md',
  uploading = false,
  onUpload,
  className = '',
}: PortraitFrameProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const s = SIZE_MAP[size]

  const handleClick = () => {
    if (onUpload) inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      onUpload(file)
      e.target.value = ''
    }
  }

  return (
    <div
      className={`
        ${s.container} rounded-full shrink-0 relative
        border-2 border-primary-dim
        shadow-[0_0_12px_rgba(212,162,78,0.1)]
        flex items-center justify-center
        overflow-hidden
        transition-all duration-[--duration-normal]
        ${onUpload ? 'cursor-pointer hover:border-primary hover:shadow-[0_0_20px_rgba(212,162,78,0.25)]' : ''}
        ${className}
      `}
      onClick={handleClick}
      role={onUpload ? 'button' : undefined}
      aria-label={onUpload ? 'Upload portrait' : undefined}
    >
      {uploading ? (
        <div className="animate-pulse text-primary">
          <GameIcon icon={fallbackIcon} size={s.icon} />
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-primary-dim">
          <GameIcon icon={fallbackIcon} size={s.icon} />
        </div>
      )}

      {/* Upload overlay on hover */}
      {onUpload && !uploading && (
        <div className="absolute inset-0 rounded-full bg-bg-deep/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] text-text-muted tracking-wider uppercase">UPLOAD</span>
        </div>
      )}

      {onUpload && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  )
}
