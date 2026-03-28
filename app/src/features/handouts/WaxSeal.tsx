import type { HandoutSeal } from '@/lib/types'
import * as Icons from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

interface Props {
  seal: HandoutSeal
  size?: number
  draggable?: boolean
  onDragEnd?: (position: { x: number; y: number }) => void
}

function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function getClipPath(shape: 'round' | 'shield' | 'oval'): string {
  switch (shape) {
    case 'shield': return 'polygon(50% 0%, 100% 10%, 100% 65%, 50% 100%, 0% 65%, 0% 10%)'
    case 'oval': return 'ellipse(45% 50% at 50% 50%)'
    default: return 'circle(50% at 50% 50%)'
  }
}

export function WaxSeal({ seal, size = 72 }: Props) {
  if (seal.type === 'uploaded') {
    return (
      <img
        src={seal.custom_image_url}
        alt="Custom seal"
        style={{ width: size, height: size, objectFit: 'contain' }}
        draggable={false}
      />
    )
  }

  const darkColour = darkenHex(seal.colour, 0.35)
  const IconComp = (Icons as Record<string, IconComponent>)[seal.icon]
  const clipPath = getClipPath(seal.shape)

  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath,
        background: `radial-gradient(circle at 35% 35%, ${seal.colour}, ${darkenHex(seal.colour, 0.2)}, ${darkenHex(seal.colour, 0.4)})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 3px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.2)',
        position: 'relative',
      }}
    >
      {/* Inner ring */}
      <div
        style={{
          position: 'absolute',
          inset: size * 0.06,
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      {/* Icon */}
      {IconComp && (
        <div style={{ color: darkColour, fontSize: size * 0.35 }}>
          <IconComp size={size * 0.35} />
        </div>
      )}
      {/* Ring text */}
      {seal.ring_text && (
        <div
          style={{
            fontSize: Math.max(6, size * 0.09),
            color: darkColour,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: 1,
            fontFamily: "'Spectral SC', serif",
          }}
        >
          {seal.ring_text}
        </div>
      )}
    </div>
  )
}
