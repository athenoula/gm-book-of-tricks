import type {
  Campaign,
  Session,
  PlayerCharacter,
  NPC,
  Monster,
  Spell,
  Handout,
  HandoutSeal,
} from '@/lib/types'

// =============================================
// Inline types (defined in hook files, not types.ts)
// =============================================

type TimelineBlock = {
  id: string
  session_id: string
  campaign_id: string
  block_type: 'scene' | 'note' | 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'handout'
  source_id: string | null
  title: string
  content_snapshot: Record<string, unknown>
  sort_order: number
  is_collapsed: boolean
  created_at: string
  updated_at: string
}

type Location = {
  id: string
  campaign_id: string
  name: string
  description: string | null
  type: string | null
  parent_location_id: string | null
  map_url: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Item = {
  id: string
  campaign_id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'magic_item' | 'equipment' | 'consumable' | 'other'
  rarity: string | null
  cost: string | null
  stackable: boolean
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  item_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type Battle = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  type: 'template' | 'save_state'
  round: number
  active_index: number
  in_combat: boolean
  combatant_data: {
    name: string
    hp_max: number
    armor_class: number
    initiative: number
    is_player: boolean
  }[]
  notes: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Helper functions
// =============================================

/** Generates YAML frontmatter from an object, filtering null/undefined values */
function frontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      if (typeof v === 'string' && (v.includes(':') || v.includes('#') || v.includes('"') || v.includes("'"))) {
        return `${k}: "${v.replace(/"/g, '\\"')}"`
      }
      if (Array.isArray(v)) {
        if (v.length === 0) return null
        return `${k}:\n${v.map(item => `  - ${item}`).join('\n')}`
      }
      return `${k}: ${v}`
    })
    .filter(Boolean)

  return `---\n${lines.join('\n')}\n---`
}

/** Converts an ISO date string to YYYY-MM-DD */
function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/** Returns ordinal string for a number: 1 → "1st", 2 → "2nd", etc. */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Renders a stat block Record as a markdown list */
function formatStatBlockJSON(statBlock: Record<string, unknown>): string {
  if (!statBlock || Object.keys(statBlock).length === 0) return ''

  const lines: string[] = []
  for (const [key, value] of Object.entries(statBlock)) {
    if (value === null || value === undefined) continue
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      lines.push(`- **${label}:**`)
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          const name = obj.name ?? obj.title ?? ''
          const desc = obj.desc ?? obj.description ?? ''
          if (name && desc) {
            lines.push(`  - **${name}:** ${desc}`)
          } else if (name) {
            lines.push(`  - ${name}`)
          } else {
            lines.push(`  - ${JSON.stringify(item)}`)
          }
        } else {
          lines.push(`  - ${item}`)
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`- **${label}:** ${JSON.stringify(value)}`)
    } else {
      lines.push(`- **${label}:** ${value}`)
    }
  }
  return lines.join('\n')
}

/** Summarizes a content_snapshot for timeline block display */
function summarizeSnapshot(snap: Record<string, unknown>): string {
  if (!snap || Object.keys(snap).length === 0) return ''
  const parts: string[] = []

  if (typeof snap.name === 'string') parts.push(snap.name)
  if (typeof snap.description === 'string' && snap.description) {
    parts.push(snap.description.slice(0, 120) + (snap.description.length > 120 ? '…' : ''))
  }
  if (typeof snap.challenge_rating === 'string') parts.push(`CR ${snap.challenge_rating}`)
  if (typeof snap.hp_max === 'number') parts.push(`HP ${snap.hp_max}`)
  if (typeof snap.armor_class === 'number') parts.push(`AC ${snap.armor_class}`)
  if (typeof snap.level === 'number') parts.push(`Level ${snap.level}`)
  if (typeof snap.school === 'string') parts.push(snap.school)

  return parts.join(' · ')
}

/** Formats a single timeline block for embedding in a session export */
function formatTimelineBlock(block: TimelineBlock): string {
  const lines: string[] = []
  lines.push(`### ${block.title || `(${block.block_type})`}`)
  lines.push(`> **Type:** ${block.block_type}`)

  const summary = summarizeSnapshot(block.content_snapshot)
  if (summary) {
    lines.push(`> ${summary}`)
  }

  if (block.block_type === 'scene' || block.block_type === 'note') {
    const content = block.content_snapshot.content ?? block.content_snapshot.body ?? block.content_snapshot.text
    if (typeof content === 'string' && content.trim()) {
      lines.push('')
      lines.push(content.trim())
    }
  }

  return lines.join('\n')
}

// =============================================
// Campaign formatter
// =============================================

export type CampaignCounts = {
  sessions: number
  characters: number
  npcs: number
  monsters: number
  spells: number
  locations: number
  items: number
  handouts: number
  battles: number
}

export function formatCampaign(campaign: Campaign, counts: CampaignCounts): string {
  const fm = frontmatter({
    title: campaign.name,
    game_system: campaign.game_system,
    created: formatDate(campaign.created_at),
    updated: formatDate(campaign.updated_at),
    export_date: formatDate(new Date().toISOString()),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${campaign.name}`,
    '',
  ]

  if (campaign.description) {
    lines.push(campaign.description, '')
  }

  lines.push(
    '## Campaign Summary',
    '',
    `| Entity | Count |`,
    `|--------|-------|`,
    `| Sessions | ${counts.sessions} |`,
    `| Player Characters | ${counts.characters} |`,
    `| NPCs | ${counts.npcs} |`,
    `| Monsters | ${counts.monsters} |`,
    `| Spells | ${counts.spells} |`,
    `| Locations | ${counts.locations} |`,
    `| Items | ${counts.items} |`,
    `| Handouts | ${counts.handouts} |`,
    `| Battles | ${counts.battles} |`,
    '',
    `**Game System:** ${campaign.game_system}`,
    `**Created:** ${formatDate(campaign.created_at) ?? campaign.created_at}`,
  )

  return lines.join('\n')
}

// =============================================
// Session formatter
// =============================================

export function formatSession(session: Session, blocks: TimelineBlock[]): string {
  const fm = frontmatter({
    title: session.name,
    session_number: session.session_number,
    status: session.status,
    scheduled: formatDate(session.scheduled_at),
    created: formatDate(session.created_at),
    updated: formatDate(session.updated_at),
  })

  const sessionLabel = session.session_number != null
    ? `Session ${session.session_number}: ${session.name}`
    : session.name

  const lines: string[] = [
    fm,
    '',
    `# ${sessionLabel}`,
    '',
    `**Status:** ${session.status}`,
  ]

  if (session.scheduled_at) {
    lines.push(`**Scheduled:** ${formatDate(session.scheduled_at)}`)
  }

  if (session.recap) {
    lines.push('', '## Recap', '', session.recap)
  }

  if (session.notes) {
    lines.push('', '## Notes', '', session.notes)
  }

  if (blocks.length > 0) {
    lines.push('', '## Timeline', '')
    const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)
    for (const block of sortedBlocks) {
      lines.push(formatTimelineBlock(block), '')
    }
  }

  return lines.join('\n')
}

// =============================================
// Player Character formatter
// =============================================

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function formatPC(
  pc: PlayerCharacter,
  spellNames: string[],
  inventoryItems: string[],
): string {
  const classLine = [pc.class, pc.subclass].filter(Boolean).join(' — ')

  const fm = frontmatter({
    title: pc.name,
    player: pc.player_name,
    race: pc.race,
    class: classLine || null,
    level: pc.level,
    background: pc.background,
    alignment: pc.alignment,
    created: formatDate(pc.created_at),
    updated: formatDate(pc.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${pc.name}`,
    '',
  ]

  if (pc.player_name) lines.push(`**Player:** ${pc.player_name}`)
  lines.push(
    `**Race:** ${pc.race ?? '—'}  |  **Class:** ${classLine || '—'}  |  **Level:** ${pc.level}`,
    `**Background:** ${pc.background ?? '—'}  |  **Alignment:** ${pc.alignment ?? '—'}`,
    '',
  )

  // Combat stats
  lines.push(
    '## Combat Stats',
    '',
    `| HP | Temp HP | AC | Speed | Initiative | Proficiency |`,
    `|----|---------|-----|-------|------------|-------------|`,
    `| ${pc.hp_current}/${pc.hp_max} | ${pc.hp_temp} | ${pc.armor_class} | ${pc.speed} ft | ${pc.initiative_bonus >= 0 ? '+' : ''}${pc.initiative_bonus} | +${pc.proficiency_bonus} |`,
    '',
  )

  if (pc.hit_dice_total) {
    lines.push(`**Hit Dice:** ${pc.hit_dice_total}${pc.hit_dice_remaining != null ? ` (${pc.hit_dice_remaining} remaining)` : ''}`, '')
  }

  // Ability scores
  const abs = pc.ability_scores
  lines.push(
    '## Ability Scores',
    '',
    `| STR | DEX | CON | INT | WIS | CHA |`,
    `|-----|-----|-----|-----|-----|-----|`,
    `| ${abs.strength} (${abilityModifier(abs.strength)}) | ${abs.dexterity} (${abilityModifier(abs.dexterity)}) | ${abs.constitution} (${abilityModifier(abs.constitution)}) | ${abs.intelligence} (${abilityModifier(abs.intelligence)}) | ${abs.wisdom} (${abilityModifier(abs.wisdom)}) | ${abs.charisma} (${abilityModifier(abs.charisma)}) |`,
    '',
  )

  // Proficiencies
  if (pc.saving_throw_proficiencies.length > 0) {
    lines.push(`**Saving Throw Proficiencies:** ${pc.saving_throw_proficiencies.join(', ')}`)
  }
  if (pc.skill_proficiencies.length > 0) {
    lines.push(`**Skill Proficiencies:** ${pc.skill_proficiencies.join(', ')}`)
  }
  if (pc.skill_expertises.length > 0) {
    lines.push(`**Skill Expertises:** ${pc.skill_expertises.join(', ')}`)
  }
  lines.push('')

  // Spellcasting
  if (pc.spellcasting_ability || spellNames.length > 0) {
    lines.push('## Spellcasting', '')
    if (pc.spellcasting_ability) {
      lines.push(`**Spellcasting Ability:** ${pc.spellcasting_ability}`)
    }
    if (pc.spell_slots) {
      const slotParts = Object.entries(pc.spell_slots)
        .filter(([, total]) => total > 0)
        .map(([level, total]) => {
          const used = pc.spell_slots_used?.[level] ?? 0
          return `${ordinal(Number(level))}: ${total - used}/${total}`
        })
      if (slotParts.length > 0) {
        lines.push(`**Spell Slots:** ${slotParts.join(' | ')}`)
      }
    }
    if (spellNames.length > 0) {
      lines.push('', '**Known Spells:**')
      for (const name of spellNames) {
        lines.push(`- ${name}`)
      }
    }
    lines.push('')
  }

  // Equipment
  if (pc.equipment.length > 0 || inventoryItems.length > 0) {
    lines.push('## Equipment', '')
    for (const item of pc.equipment) {
      const qty = item.quantity != null && item.quantity !== 1 ? ` ×${item.quantity}` : ''
      const desc = item.description ? ` — ${item.description}` : ''
      lines.push(`- **${item.name}**${qty}${desc}`)
    }
    for (const item of inventoryItems) {
      lines.push(`- ${item}`)
    }
    lines.push('')
  }

  // Class features
  if (pc.class_features.length > 0) {
    lines.push('## Class Features', '')
    for (const feature of pc.class_features) {
      lines.push(`### ${feature.name}`, '', feature.description, '')
    }
  }

  // Traits
  if (pc.traits.length > 0) {
    lines.push('## Traits', '')
    for (const trait of pc.traits) {
      lines.push(`### ${trait.name}`, '', trait.description, '')
    }
  }

  // Personality
  const personalityFields = [
    ['Personality Traits', pc.personality_traits],
    ['Ideals', pc.ideals],
    ['Bonds', pc.bonds],
    ['Flaws', pc.flaws],
  ].filter(([, v]) => Boolean(v)) as [string, string][]

  if (personalityFields.length > 0) {
    lines.push('## Personality', '')
    for (const [label, value] of personalityFields) {
      lines.push(`**${label}:** ${value}`, '')
    }
  }

  if (pc.backstory) {
    lines.push('## Backstory', '', pc.backstory, '')
  }

  if (pc.appearance) {
    lines.push('## Appearance', '', pc.appearance, '')
  }

  if (pc.notes) {
    lines.push('## Notes', '', pc.notes, '')
  }

  return lines.join('\n')
}

// =============================================
// NPC formatter
// =============================================

export function formatNPC(npc: NPC, spellNames: string[]): string {
  const fm = frontmatter({
    title: npc.name,
    race: npc.race,
    occupation: npc.occupation,
    created: formatDate(npc.created_at),
    updated: formatDate(npc.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${npc.name}`,
    '',
  ]

  const meta = [npc.race, npc.occupation].filter(Boolean).join(', ')
  if (meta) lines.push(`*${meta}*`, '')

  if (npc.appearance) {
    lines.push('## Appearance', '', npc.appearance, '')
  }

  if (npc.personality) {
    lines.push('## Personality', '', npc.personality, '')
  }

  // Stats
  const stats = npc.stats
  const hasStats = Object.values(stats).some(v => v !== undefined && v !== null)
  if (hasStats) {
    lines.push('## Stats', '')
    if (stats.hp !== undefined) lines.push(`**HP:** ${stats.hp}`)
    if (stats.ac !== undefined) lines.push(`**AC:** ${stats.ac}`)

    const abilityStats = [
      ['STR', stats.strength],
      ['DEX', stats.dexterity],
      ['CON', stats.constitution],
      ['INT', stats.intelligence],
      ['WIS', stats.wisdom],
      ['CHA', stats.charisma],
    ].filter(([, v]) => v !== undefined) as [string, number][]

    if (abilityStats.length > 0) {
      lines.push('')
      const headers = abilityStats.map(([label]) => label).join(' | ')
      const dividers = abilityStats.map(() => '---').join(' | ')
      const values = abilityStats.map(([, v]) => `${v} (${abilityModifier(v)})`).join(' | ')
      lines.push(`| ${headers} |`, `| ${dividers} |`, `| ${values} |`)
    }
    lines.push('')
  }

  // Spells
  if (spellNames.length > 0) {
    lines.push('## Spells', '')
    for (const name of spellNames) {
      lines.push(`- ${name}`)
    }
    lines.push('')
  }

  // Stat block
  if (npc.stat_block && Object.keys(npc.stat_block).length > 0) {
    lines.push('## Full Stat Block', '')
    lines.push(formatStatBlockJSON(npc.stat_block))
    lines.push('')
  }

  if (npc.notes) {
    lines.push('## Notes', '', npc.notes, '')
  }

  return lines.join('\n')
}

// =============================================
// Monster formatter
// =============================================

export function formatMonster(monster: Monster): string {
  const fm = frontmatter({
    title: monster.name,
    source: monster.source,
    srd_slug: monster.srd_slug,
    size: monster.size,
    type: monster.type,
    alignment: monster.alignment,
    challenge_rating: monster.challenge_rating,
    armor_class: monster.armor_class,
    hit_points: monster.hit_points,
    source_book: monster.source_book,
    created: formatDate(monster.created_at),
    updated: formatDate(monster.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${monster.name}`,
    '',
  ]

  // Type line
  const typeParts = [monster.size, monster.type, monster.alignment].filter(Boolean)
  if (typeParts.length > 0) {
    lines.push(`*${typeParts.join(', ')}*`, '')
  }

  // Core stats
  lines.push(
    `**Armor Class:** ${monster.armor_class}${monster.armor_desc ? ` (${monster.armor_desc})` : ''}`,
    `**Hit Points:** ${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}`,
  )

  // Speed
  const speedParts = Object.entries(monster.speed).map(([type, val]) =>
    type === 'walk' ? `${val} ft.` : `${type} ${val} ft.`
  )
  if (speedParts.length > 0) {
    lines.push(`**Speed:** ${speedParts.join(', ')}`)
  }

  if (monster.challenge_rating) {
    lines.push(`**Challenge:** ${monster.challenge_rating}`)
  }

  lines.push('')

  // Ability scores from stat_block
  const sb = monster.stat_block
  const abilityKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
  const scores = abilityKeys.map(k => sb[k] as number | undefined)
  if (scores.some(s => s !== undefined)) {
    lines.push(
      '## Ability Scores',
      '',
      `| STR | DEX | CON | INT | WIS | CHA |`,
      `|-----|-----|-----|-----|-----|-----|`,
      `| ${scores.map(s => s !== undefined ? `${s} (${abilityModifier(s)})` : '—').join(' | ')} |`,
      '',
    )
  }

  // Special abilities
  const specialAbilities = sb.special_abilities as Array<{ name: string; desc: string }> | undefined
  if (Array.isArray(specialAbilities) && specialAbilities.length > 0) {
    lines.push('## Special Abilities', '')
    for (const ability of specialAbilities) {
      lines.push(`**${ability.name}.** ${ability.desc}`, '')
    }
  }

  // Actions
  const actions = sb.actions as Array<{ name: string; desc: string }> | undefined
  if (Array.isArray(actions) && actions.length > 0) {
    lines.push('## Actions', '')
    for (const action of actions) {
      lines.push(`**${action.name}.** ${action.desc}`, '')
    }
  }

  // Bonus actions
  const bonusActions = sb.bonus_actions as Array<{ name: string; desc: string }> | undefined
  if (Array.isArray(bonusActions) && bonusActions.length > 0) {
    lines.push('## Bonus Actions', '')
    for (const action of bonusActions) {
      lines.push(`**${action.name}.** ${action.desc}`, '')
    }
  }

  // Reactions
  const reactions = sb.reactions as Array<{ name: string; desc: string }> | undefined
  if (Array.isArray(reactions) && reactions.length > 0) {
    lines.push('## Reactions', '')
    for (const reaction of reactions) {
      lines.push(`**${reaction.name}.** ${reaction.desc}`, '')
    }
  }

  // Legendary actions
  const legendaryActions = sb.legendary_actions as Array<{ name: string; desc: string }> | undefined
  if (Array.isArray(legendaryActions) && legendaryActions.length > 0) {
    lines.push('## Legendary Actions', '')
    for (const action of legendaryActions) {
      lines.push(`**${action.name}.** ${action.desc}`, '')
    }
  }

  // Remaining stat_block fields (skip ones already rendered)
  const renderedKeys = new Set([
    ...abilityKeys,
    'special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions',
  ])
  const remainingEntries = Object.entries(sb).filter(([k]) => !renderedKeys.has(k))
  if (remainingEntries.length > 0) {
    lines.push('## Additional Stats', '')
    const remaining = Object.fromEntries(remainingEntries)
    lines.push(formatStatBlockJSON(remaining))
    lines.push('')
  }

  if (monster.notes) {
    lines.push('## Notes', '', monster.notes, '')
  }

  return lines.join('\n')
}

// =============================================
// Spell formatter
// =============================================

export function formatSpell(spell: Spell): string {
  const levelLabel = spell.level === 0 ? 'Cantrip' : `${ordinal(spell.level)}-level`
  const schoolLabel = spell.school ? ` ${spell.school}` : ''

  const fm = frontmatter({
    title: spell.name,
    level: spell.level,
    school: spell.school,
    source: spell.source,
    srd_slug: spell.srd_slug,
    source_book: spell.source_book,
    classes: spell.classes,
    created: formatDate(spell.created_at),
    updated: formatDate(spell.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${spell.name}`,
    '',
    `*${levelLabel}${schoolLabel}*`,
    '',
  ]

  const metaFields = [
    ['Casting Time', spell.casting_time],
    ['Range', spell.range],
    ['Components', spell.components],
    ['Duration', spell.duration],
  ].filter(([, v]) => Boolean(v)) as [string, string][]

  for (const [label, value] of metaFields) {
    let val = value
    if (label === 'Duration' && spell.concentration) val = `Concentration, up to ${value}`
    lines.push(`**${label}:** ${val}`)
  }

  if (spell.ritual) lines.push('**Ritual:** Yes')
  if (spell.classes.length > 0) lines.push(`**Classes:** ${spell.classes.join(', ')}`)
  lines.push('')

  // Description from spell_data
  if (spell.spell_data) {
    const sd = spell.spell_data
    const desc = sd.desc ?? sd.description
    if (typeof desc === 'string' && desc) {
      lines.push('## Description', '', desc, '')
    } else if (Array.isArray(desc)) {
      lines.push('## Description', '', (desc as string[]).join('\n\n'), '')
    }

    const higherLevel = sd.higher_level ?? sd.at_higher_levels
    if (typeof higherLevel === 'string' && higherLevel) {
      lines.push('**At Higher Levels:** ' + higherLevel, '')
    } else if (Array.isArray(higherLevel) && higherLevel.length > 0) {
      lines.push('**At Higher Levels:** ' + (higherLevel as string[]).join(' '), '')
    }

    // Render any remaining spell_data fields not yet displayed
    const renderedSdKeys = new Set(['desc', 'description', 'higher_level', 'at_higher_levels'])
    const remainingSD = Object.entries(sd).filter(([k]) => !renderedSdKeys.has(k))
    if (remainingSD.length > 0) {
      lines.push('## Additional Data', '')
      lines.push(formatStatBlockJSON(Object.fromEntries(remainingSD)))
      lines.push('')
    }
  }

  if (spell.notes) {
    lines.push('## Notes', '', spell.notes, '')
  }

  return lines.join('\n')
}

// =============================================
// Item formatter
// =============================================

export function formatItem(item: Item): string {
  const fm = frontmatter({
    title: item.name,
    type: item.type,
    rarity: item.rarity,
    cost: item.cost,
    source: item.source,
    srd_slug: item.srd_slug,
    stackable: item.stackable,
    created: formatDate(item.created_at),
    updated: formatDate(item.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${item.name}`,
    '',
  ]

  const meta = [
    item.type.replace(/_/g, ' '),
    item.rarity,
    item.cost ? `Cost: ${item.cost}` : null,
  ].filter(Boolean).join(' · ')

  if (meta) lines.push(`*${meta}*`, '')

  if (item.description) {
    lines.push(item.description, '')
  }

  if (item.item_data && Object.keys(item.item_data).length > 0) {
    lines.push('## Properties', '')
    lines.push(formatStatBlockJSON(item.item_data))
    lines.push('')
  }

  return lines.join('\n')
}

// =============================================
// Location formatter
// =============================================

export function formatLocation(location: Location, allLocations: Location[]): string {
  const parent = location.parent_location_id
    ? allLocations.find(l => l.id === location.parent_location_id)
    : null

  const children = allLocations.filter(l => l.parent_location_id === location.id)

  const fm = frontmatter({
    title: location.name,
    type: location.type,
    parent: parent?.name ?? null,
    created: formatDate(location.created_at),
    updated: formatDate(location.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${location.name}`,
    '',
  ]

  const meta = [location.type, parent ? `Part of: ${parent.name}` : null].filter(Boolean).join(' · ')
  if (meta) lines.push(`*${meta}*`, '')

  if (location.description) {
    lines.push(location.description, '')
  }

  if (children.length > 0) {
    lines.push('## Sub-locations', '')
    for (const child of children) {
      lines.push(`- **${child.name}**${child.type ? ` *(${child.type})*` : ''}`)
    }
    lines.push('')
  }

  if (location.notes) {
    lines.push('## Notes', '', location.notes, '')
  }

  if (location.map_url) {
    lines.push(`## Map`, '', `[View Map](${location.map_url})`, '')
  }

  return lines.join('\n')
}

// =============================================
// Handout formatter
// =============================================

function describeSeal(seal: HandoutSeal): string {
  if (seal.type === 'built') {
    return `Seal: ${seal.icon} (${seal.shape}, ${seal.colour}, "${seal.ring_text}")`
  }
  return `Seal: Custom image (${seal.custom_image_url})`
}

export function formatHandout(handout: Handout): string {
  const fm = frontmatter({
    title: handout.name,
    template: handout.template,
    created: formatDate(handout.created_at),
    updated: formatDate(handout.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${handout.name}`,
    '',
    `**Template:** ${handout.template}`,
    '',
  ]

  // Render content fields
  const content = handout.content
  if (content && Object.keys(content).length > 0) {
    lines.push('## Content', '')
    for (const [key, value] of Object.entries(content)) {
      if (value === null || value === undefined || value === '') continue
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      if (typeof value === 'string') {
        lines.push(`**${label}:**`, '', value, '')
      } else {
        lines.push(`**${label}:** ${JSON.stringify(value)}`)
      }
    }
  }

  if (handout.seal) {
    lines.push('## Seal', '', describeSeal(handout.seal), '')
  }

  // Style
  const style = handout.style
  if (style && Object.keys(style).length > 0) {
    const styleParts = [
      style.font_family ? `Font: ${style.font_family}` : null,
      style.font_size ? `Size: ${style.font_size}px` : null,
      style.text_align ? `Align: ${style.text_align}` : null,
    ].filter(Boolean)
    if (styleParts.length > 0) {
      lines.push('## Style', '', styleParts.join(' · '), '')
    }
  }

  if (handout.image_url) {
    lines.push('## Image', '', `![Handout Image](${handout.image_url})`, '')
  }

  return lines.join('\n')
}

// =============================================
// Battle formatter
// =============================================

export function formatBattle(battle: Battle): string {
  const fm = frontmatter({
    title: battle.name,
    type: battle.type,
    round: battle.round,
    in_combat: battle.in_combat,
    created: formatDate(battle.created_at),
    updated: formatDate(battle.updated_at),
  })

  const lines: string[] = [
    fm,
    '',
    `# ${battle.name}`,
    '',
    `**Type:** ${battle.type}  |  **Round:** ${battle.round}  |  **In Combat:** ${battle.in_combat ? 'Yes' : 'No'}`,
    '',
  ]

  if (battle.combatant_data.length > 0) {
    lines.push(
      '## Combatants',
      '',
      `| # | Name | Type | Initiative | HP | AC |`,
      `|---|------|------|------------|----|----|`,
    )

    const sorted = [...battle.combatant_data].sort((a, b) => b.initiative - a.initiative)
    sorted.forEach((c, i) => {
      const active = battle.in_combat && i === battle.active_index ? ' ◀' : ''
      const type = c.is_player ? 'PC' : 'NPC/Monster'
      lines.push(`| ${i + 1} | ${c.name}${active} | ${type} | ${c.initiative} | ${c.hp_max} | ${c.armor_class} |`)
    })
    lines.push('')
  }

  if (battle.notes) {
    lines.push('## Notes', '', battle.notes, '')
  }

  return lines.join('\n')
}
