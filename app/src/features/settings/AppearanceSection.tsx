import { useTheme } from '@/lib/theme'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiSun, GiMoonBats, GiCog, type IconComponent } from '@/components/ui/icons'

type ThemeOption = { value: 'light' | 'dark' | 'system'; label: string; icon: IconComponent }

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: GiSun },
  { value: 'dark', label: 'Dark', icon: GiMoonBats },
  { value: 'system', label: 'System', icon: GiCog },
]

export function AppearanceSection() {
  const preference = useTheme((s) => s.preference)
  const setPreference = useTheme((s) => s.setPreference)

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Appearance</h2>
      <p className="text-text-muted text-sm mb-6">Choose your theme.</p>

      <div className="flex gap-2">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPreference(opt.value)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-[--radius-md]
              text-sm font-medium transition-all duration-[--duration-fast] cursor-pointer
              border
              ${preference === opt.value
                ? 'bg-primary-ghost text-primary-light border-primary/30'
                : 'bg-bg-base text-text-muted border-border hover:text-text-body hover:bg-bg-raised hover:border-border-hover'
              }
            `}
          >
            <GameIcon icon={opt.icon} size="sm" />
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )
}
