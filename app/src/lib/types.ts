export type Campaign = {
  id: string
  gm_id: string
  name: string
  description: string | null
  game_system: string
  created_at: string
  updated_at: string
}

export type Session = {
  id: string
  campaign_id: string
  name: string
  session_number: number | null
  scheduled_at: string | null
  status: 'upcoming' | 'in_progress' | 'completed'
  notes: string | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  display_name: string | null
  email: string | null
  discord: string | null
  created_at: string
  updated_at: string
}

export type AbilityScores = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type PlayerCharacter = {
  id: string
  campaign_id: string
  name: string
  race: string | null
  class: string | null
  subclass: string | null
  level: number
  background: string | null
  alignment: string | null
  ability_scores: AbilityScores
  saving_throw_proficiencies: string[]
  skill_proficiencies: string[]
  skill_expertises: string[]
  hp_current: number
  hp_max: number
  hp_temp: number
  armor_class: number
  speed: number
  initiative_bonus: number
  proficiency_bonus: number
  hit_dice_total: string | null
  hit_dice_remaining: number | null
  spellcasting_ability: string | null
  spell_slots: Record<string, number> | null
  spell_slots_used: Record<string, number> | null
  equipment: { name: string; quantity?: number; description?: string }[]
  class_features: { name: string; description: string }[]
  traits: { name: string; description: string }[]
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  appearance: string | null
  notes: string | null
  player_name: string | null
  player_email: string | null
  player_discord: string | null
  portrait_url: string | null
  created_at: string
  updated_at: string
}

export type NPC = {
  id: string
  campaign_id: string
  name: string
  race: string | null
  occupation: string | null
  personality: string | null
  appearance: string | null
  stats: {
    hp?: number
    ac?: number
    strength?: number
    dexterity?: number
    constitution?: number
    intelligence?: number
    wisdom?: number
    charisma?: number
  }
  stat_block: Record<string, unknown> | null
  notes: string | null
  portrait_url: string | null
  created_at: string
  updated_at: string
}

export type Monster = {
  id: string
  campaign_id: string
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  name: string
  size: string | null
  type: string | null
  alignment: string | null
  challenge_rating: string | null
  armor_class: number
  armor_desc: string | null
  hit_points: number
  hit_dice: string | null
  speed: Record<string, number>
  stat_block: Record<string, unknown>
  source_book: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Spell = {
  id: string
  campaign_id: string
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  name: string
  level: number
  school: string | null
  casting_time: string | null
  range: string | null
  duration: string | null
  concentration: boolean
  ritual: boolean
  components: string | null
  classes: string[]
  spell_data: Record<string, unknown> | null
  source_book: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const GAME_SYSTEMS = [
  { value: 'dnd5e-2024', label: 'D&D 5e (2024)' },
  { value: 'dnd5e-2014', label: 'D&D 5e (2014)' },
  { value: 'pf2e', label: 'Pathfinder 2e' },
  { value: 'pf1e', label: 'Pathfinder 1e' },
  { value: 'other', label: 'Other' },
] as const

export const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
] as const

export const SPELL_CLASSES = [
  'Bard', 'Cleric', 'Druid', 'Paladin',
  'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
] as const

export type CampaignFile = {
  id: string
  campaign_id: string
  name: string
  file_type: string
  storage_path: string
  file_size: number | null
  created_at: string
}
