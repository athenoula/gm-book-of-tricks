import type { IconComponent } from './icons'
import {
  GiPanFlute, GiPopeCrown, GiHighShot, GiSpellBook, GiFist,
  GiOakLeaf, GiChoppedSkull, GiPrayerBeads, GiKnightBanner,
  GiBroadDagger, GiMagicPalm, GiWarlockEye, GiCog, GiHoodedFigure,
} from './icons'

const CLASS_ICONS: Record<string, IconComponent> = {
  bard: GiPanFlute,
  cleric: GiPopeCrown,
  ranger: GiHighShot,
  wizard: GiSpellBook,
  fighter: GiFist,
  druid: GiOakLeaf,
  barbarian: GiChoppedSkull,
  monk: GiPrayerBeads,
  paladin: GiKnightBanner,
  rogue: GiBroadDagger,
  sorcerer: GiMagicPalm,
  warlock: GiWarlockEye,
  artificer: GiCog,
}

export function getClassIcon(className: string | null): IconComponent {
  if (!className) return GiHoodedFigure
  return CLASS_ICONS[className.toLowerCase()] ?? GiHoodedFigure
}
