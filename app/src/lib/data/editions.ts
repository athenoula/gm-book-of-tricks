export const EDITION_SLUGS: Record<string, string> = {
  'dnd5e-2014': 'wotc-srd',
  'dnd5e-2024': 'wotc-srd52',
}

export const RACES_2014 = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn',
] as const

export const RACES_2024 = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Tiefling', 'Dragonborn', 'Orc', 'Aasimar', 'Goliath', 'Ardling',
] as const

export const CLASSES = [
  'Fighter', 'Wizard', 'Rogue', 'Cleric', 'Bard', 'Barbarian',
  'Druid', 'Monk', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Artificer',
] as const

export function getRacesForEdition(gameSystem: string): readonly string[] {
  if (gameSystem === 'dnd5e-2024') return RACES_2024
  if (gameSystem === 'dnd5e-2014') return RACES_2014
  return [...new Set([...RACES_2014, ...RACES_2024])]
}

export function getEditionSlug(gameSystem: string): string | undefined {
  return EDITION_SLUGS[gameSystem]
}

export const MONSTER_SIZES = [
  'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan',
] as const

export const MONSTER_TYPES = [
  'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon',
  'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid',
  'Monstrosity', 'Ooze', 'Plant', 'Undead',
] as const

export const CHALLENGE_RATINGS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
] as const
