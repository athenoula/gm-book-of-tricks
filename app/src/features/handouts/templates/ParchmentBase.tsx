import type { HandoutTemplate } from '@/lib/types'

interface Props {
  template: HandoutTemplate
  children: React.ReactNode
  className?: string
}

const TEMPLATE_TREATMENTS: Record<HandoutTemplate, {
  bg: string
  edgeDarkness: number
  extraClasses: string
}> = {
  scroll: { bg: 'linear-gradient(170deg, #d4a574, #c4956a, #b8865c, #d4a574)', edgeDarkness: 0.3, extraClasses: '' },
  wanted: { bg: 'linear-gradient(170deg, #c4956a, #b08050, #a07040, #c4956a)', edgeDarkness: 0.45, extraClasses: '' },
  decree: { bg: 'linear-gradient(170deg, #e8dcc8, #ddd0b8, #d4c4a8, #e8dcc8)', edgeDarkness: 0.15, extraClasses: '' },
  map_note: { bg: 'linear-gradient(170deg, #c4956a, #b08050, #9a7040, #c4956a)', edgeDarkness: 0.5, extraClasses: '' },
  tavern: { bg: 'linear-gradient(170deg, #3d2b1f, #2e1f14, #3d2b1f, #342518)', edgeDarkness: 0.3, extraClasses: '' },
  broadsheet: { bg: 'linear-gradient(170deg, #e8deb5, #ddd4a5, #d4ca98, #e8deb5)', edgeDarkness: 0.2, extraClasses: '' },
  invitation: { bg: 'linear-gradient(170deg, #f0e8d8, #e8dfc8, #f0e8d8, #e8dfc8)', edgeDarkness: 0.1, extraClasses: '' },
  blank: { bg: 'linear-gradient(170deg, #d4a574, #c4956a, #b8865c, #d4a574)', edgeDarkness: 0.25, extraClasses: '' },
}

export function ParchmentBase({ template, children, className = '' }: Props) {
  const treatment = TEMPLATE_TREATMENTS[template]
  const textColour = template === 'tavern' ? '#e8dcc8' : '#3d2010'

  return (
    <div
      className={`relative rounded overflow-hidden shadow-lg ${className}`}
      style={{
        background: treatment.bg,
        color: textColour,
        minHeight: 420,
      }}
    >
      {/* Aged edges vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(80,40,10,${treatment.edgeDarkness}) 100%)`,
        }}
      />
      {/* Paper grain texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* Content */}
      <div className="relative z-[1] p-10">
        {children}
      </div>
    </div>
  )
}
