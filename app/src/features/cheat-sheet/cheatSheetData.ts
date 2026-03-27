export interface SkillEntry {
  ability: string
  abilityShort: string
  skills: string[]
}

export interface ConditionEntry {
  name: string
  description: string
}

export interface ExhaustionLevel {
  level: number
  effect: string
}

export interface CoverEntry {
  type: string
  bonus: string
  description: string
}

export interface DCEntry {
  difficulty: string
  dc: number
}

export interface TravelPaceEntry {
  pace: string
  perMinute: string
  perHour: string
  perDay: string
  effect: string
}

export interface ItemEntry {
  name: string
  cost: string
}

export interface ItemGroup {
  category: string
  items: ItemEntry[]
}

export const SKILL_GROUPS: SkillEntry[] = [
  { ability: 'Strength', abilityShort: 'STR', skills: ['Athletics'] },
  { ability: 'Dexterity', abilityShort: 'DEX', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
  { ability: 'Constitution', abilityShort: 'CON', skills: [] },
  { ability: 'Intelligence', abilityShort: 'INT', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
  { ability: 'Wisdom', abilityShort: 'WIS', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
  { ability: 'Charisma', abilityShort: 'CHA', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] },
]

export const CONDITIONS: ConditionEntry[] = [
  { name: 'Blinded', description: "Can't see. Auto-fail sight checks. Attacks have disadvantage; attacks against have advantage." },
  { name: 'Charmed', description: "Can't attack charmer. Charmer has advantage on social checks." },
  { name: 'Deafened', description: "Can't hear. Auto-fail hearing checks." },
  { name: 'Frightened', description: "Disadvantage on checks/attacks while source is in sight. Can't willingly move closer." },
  { name: 'Grappled', description: 'Speed is 0. Ends if grappler incapacitated or effect moves target out of reach.' },
  { name: 'Incapacitated', description: "Can't take actions or reactions." },
  { name: 'Invisible', description: 'Impossible to see without magic/special sense. Advantage on attacks; attacks against have disadvantage.' },
  { name: 'Paralyzed', description: "Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits." },
  { name: 'Petrified', description: "Turned to stone. Weight x10. Incapacitated, can't move/speak. Resistance to all damage. Immune to poison/disease." },
  { name: 'Poisoned', description: 'Disadvantage on attacks and ability checks.' },
  { name: 'Prone', description: 'Disadvantage on attacks. Melee attacks against have advantage; ranged against have disadvantage. Half movement to stand.' },
  { name: 'Restrained', description: 'Speed is 0. Attacks have disadvantage; attacks against have advantage. Disadvantage on DEX saves.' },
  { name: 'Stunned', description: "Incapacitated, can't move, can only speak falteringly. Auto-fail STR/DEX saves. Attacks against have advantage." },
  { name: 'Unconscious', description: "Incapacitated, can't move or speak, drops held items, falls prone. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits." },
]

export const EXHAUSTION_LEVELS: ExhaustionLevel[] = [
  { level: 1, effect: 'Disadvantage on ability checks' },
  { level: 2, effect: 'Speed halved' },
  { level: 3, effect: 'Disadvantage on attacks and saves' },
  { level: 4, effect: 'HP max halved' },
  { level: 5, effect: 'Speed reduced to 0' },
  { level: 6, effect: 'Death' },
]

export const COVER_RULES: CoverEntry[] = [
  { type: 'Half', bonus: '+2 AC & DEX saves', description: 'Low wall, furniture, another creature' },
  { type: 'Three-Quarters', bonus: '+5 AC & DEX saves', description: 'Portcullis, arrow slit' },
  { type: 'Full', bonus: "Can't be targeted", description: 'Completely concealed by obstacle' },
]

export const DC_GUIDELINES: DCEntry[] = [
  { difficulty: 'Very Easy', dc: 5 },
  { difficulty: 'Easy', dc: 10 },
  { difficulty: 'Medium', dc: 15 },
  { difficulty: 'Hard', dc: 20 },
  { difficulty: 'Very Hard', dc: 25 },
  { difficulty: 'Nearly Impossible', dc: 30 },
]

export const TRAVEL_PACE: TravelPaceEntry[] = [
  { pace: 'Fast', perMinute: '400 ft', perHour: '4 miles', perDay: '30 miles', effect: '-5 passive Perception' },
  { pace: 'Normal', perMinute: '300 ft', perHour: '3 miles', perDay: '24 miles', effect: '—' },
  { pace: 'Slow', perMinute: '200 ft', perHour: '2 miles', perDay: '18 miles', effect: 'Can use Stealth' },
]

export const COMMON_ITEMS: ItemGroup[] = [
  {
    category: 'Adventuring Gear',
    items: [
      { name: 'Rope (50 ft)', cost: '1 gp' },
      { name: 'Torch (10)', cost: '1 cp each' },
      { name: 'Rations (1 day)', cost: '5 sp' },
      { name: 'Waterskin', cost: '2 sp' },
      { name: 'Bedroll', cost: '1 gp' },
      { name: 'Tinderbox', cost: '5 sp' },
      { name: 'Piton (10)', cost: '5 cp each' },
      { name: 'Grappling Hook', cost: '2 gp' },
    ],
  },
  {
    category: 'Potions',
    items: [
      { name: 'Healing (2d4+2)', cost: '50 gp' },
      { name: 'Greater Healing (4d4+4)', cost: '100 gp' },
    ],
  },
  {
    category: 'Services',
    items: [
      { name: 'Ale (mug)', cost: '4 cp' },
      { name: 'Meal (modest)', cost: '3 sp' },
      { name: 'Inn stay (modest)', cost: '5 sp' },
      { name: 'Inn stay (comfortable)', cost: '8 sp' },
      { name: 'Messenger (per mile)', cost: '2 cp' },
    ],
  },
]

export const TAB_CONFIG = [
  { id: 'skills' as const, label: 'Skills' },
  { id: 'conditions' as const, label: 'Conditions' },
  { id: 'cover' as const, label: 'Cover' },
  { id: 'dcs' as const, label: 'DCs' },
  { id: 'travel' as const, label: 'Travel' },
  { id: 'items' as const, label: 'Items' },
]
