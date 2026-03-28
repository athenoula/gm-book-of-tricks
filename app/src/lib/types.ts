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
  recap: string | null
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
  xp: number
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

export type HandoutTemplate = 'scroll' | 'wanted' | 'decree' | 'map_note' | 'tavern' | 'broadsheet' | 'invitation' | 'blank'

export type HandoutSeal = {
  type: 'built'
  icon: string
  ring_text: string
  colour: string
  shape: 'round' | 'shield' | 'oval'
  position: { x: number; y: number }
} | {
  type: 'uploaded'
  custom_image_url: string
  position: { x: number; y: number }
}

export type Handout = {
  id: string
  campaign_id: string
  name: string
  template: HandoutTemplate
  content: Record<string, unknown>
  style: { font_family?: string; font_size?: number; text_align?: string }
  seal: HandoutSeal | null
  image_url: string | null
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

// =============================================
// Beta Feedback
// =============================================

export type FeedbackStep1 = {
  role: string
  experience: string
  systems: string[]
  frequency: string
}

export type FeedbackStep2 = {
  detected_features: { name: string; count: number }[]
  ratings: Record<string, 'meh' | 'good' | 'love'>
  best_thing: string
  worst_thing: string
}

export type FeedbackStep3 = {
  wanted_features: string[]
  top_wish: string
  other_tools: string[]
}

export type FeedbackStep4 = {
  paid_tools: string[]
  monthly_spend: string
  fair_price: string
  anything_else: string
}

export type FeedbackResponse = {
  id: string
  user_id: string
  step1: FeedbackStep1 | null
  step2: FeedbackStep2 | null
  step3: FeedbackStep3 | null
  step4: FeedbackStep4 | null
  current_step: number
  completed: boolean
  created_at: string
  updated_at: string
}

export type BugReport = {
  id: string
  user_id: string
  type: 'bug' | 'feature' | 'feedback'
  title: string
  description: string
  severity: 'blocking' | 'annoying' | 'minor' | null
  page: string | null
  screenshot_ids: string[]
  status: 'new' | 'seen' | 'resolved'
  created_at: string
}

export const FEEDBACK_ROLES = [
  'Forever DM',
  'DM & Player',
  'Mostly Player',
  'New to TTRPGs',
] as const

export const FEEDBACK_EXPERIENCE = [
  'Less than a year',
  '1–3 years',
  '3–10 years',
  '10+ years',
] as const

export const FEEDBACK_SYSTEMS = [
  'D&D 5e',
  'D&D 5e (2024)',
  'Pathfinder 2e',
  'Call of Cthulhu',
  'Blades in the Dark',
] as const

export const FEEDBACK_FREQUENCY = [
  'Weekly',
  'Biweekly',
  'Monthly',
  'Irregularly',
  'Not currently running',
] as const

export const FEEDBACK_WANTED_FEATURES = [
  'In-game calendar',
  'Interactive maps',
  'Faction tracker',
  'NPC relationship web',
  'Session recap / notes',
  'Quest tracker',
  'Player-facing portal',
  'Discord integration',
  'Music / ambiance links',
  'AI-generated portraits',
  'XP / leveling tracker',
  'Shareable handouts',
  'Offline mode',
  'Mobile app',
  'World state changelog',
] as const

export const FEEDBACK_OTHER_TOOLS = [
  'Google Docs',
  'Notion',
  'OneNote',
  'Obsidian',
  'Pen & paper',
  'World Anvil',
  'Kanka',
] as const

export const FEEDBACK_PAID_TOOLS = [
  'D&D Beyond subscription',
  'D&D Beyond books',
  'Roll20',
  'Foundry VTT',
  'Fantasy Grounds',
  'World Anvil',
  'Kanka',
  'Owlbear Rodeo',
  "DM's Guild / DriveThruRPG",
  'Patreon (map makers, etc.)',
  'None — I only use free tools',
] as const

export const FEEDBACK_MONTHLY_SPEND = [
  '$0',
  '$1–5',
  '$5–15',
  '$15–30',
  '$30+',
] as const

export const FEEDBACK_FAIR_PRICE = [
  'Free only',
  '$3–5/mo',
  '$5–10/mo',
  '$10–15/mo',
  '$15+/mo',
] as const

export const REPORT_TYPES = ['bug', 'feature', 'feedback'] as const
export const REPORT_SEVERITIES = ['blocking', 'annoying', 'minor'] as const

export const APP_PAGES = [
  'Campaign Overview',
  'Sessions',
  'Session Timeline',
  'Characters',
  'Bestiary',
  'Spellbook',
  'Locations',
  'Generators',
  'Inspiration Board',
  'Initiative Tracker',
  'Quick Reference',
  'Command Palette',
  'Other',
] as const
