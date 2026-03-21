/** D&D 5e ability modifier: (score - 10) / 2 rounded down */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Format modifier with +/- prefix */
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** Roll a d20 (1-20) */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

/** D&D 5e conditions with colours */
export const CONDITIONS = [
  { name: 'Blinded', color: '#6b7280' },
  { name: 'Charmed', color: '#ec4899' },
  { name: 'Concentrating', color: '#3b82f6' },
  { name: 'Deafened', color: '#6b7280' },
  { name: 'Exhaustion', color: '#92400e' },
  { name: 'Frightened', color: '#a855f7' },
  { name: 'Grappled', color: '#f97316' },
  { name: 'Incapacitated', color: '#6b7280' },
  { name: 'Invisible', color: '#06b6d4' },
  { name: 'Paralyzed', color: '#eab308' },
  { name: 'Petrified', color: '#78716c' },
  { name: 'Poisoned', color: '#22c55e' },
  { name: 'Prone', color: '#b45309' },
  { name: 'Restrained', color: '#f97316' },
  { name: 'Stunned', color: '#eab308' },
  { name: 'Unconscious', color: '#ef4444' },
] as const

export type ConditionName = (typeof CONDITIONS)[number]['name']
