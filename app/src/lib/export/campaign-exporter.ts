import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import { useExportStore } from '@/features/settings/useExportStore'
import { useToastStore } from '@/lib/toast'
import type { Campaign, Session, PlayerCharacter, NPC, Monster, Spell, Handout } from '@/lib/types'
import {
  formatCampaign,
  formatSession,
  formatPC,
  formatNPC,
  formatMonster,
  formatSpell,
  formatItem,
  formatLocation,
  formatHandout,
  formatBattle,
  type CampaignCounts,
} from '@/lib/export/markdown-formatters'
import { slugify, uniqueSlugs, padSessionNumber } from '@/lib/export/slugify'

// =============================================
// Local inline types (match markdown-formatters.ts)
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
// Progress callback type
// =============================================

type ProgressCallback = (progress: number, step: string) => void

// =============================================
// Internal helper: trigger browser download
// =============================================

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =============================================
// Internal: fetch all campaign data and write into a JSZip folder
// =============================================

async function exportCampaignToFolder(
  zip: JSZip,
  campaignId: string,
  onProgress: ProgressCallback,
): Promise<void> {
  // Step 1: Fetch campaign row
  onProgress(5, 'Fetching campaign...')
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? 'Campaign not found')
  }

  const typedCampaign = campaign as unknown as Campaign
  const folder = zip.folder(slugify(typedCampaign.name))!

  // Step 2: Fetch sessions
  onProgress(10, 'Fetching sessions...')
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: true })

  if (sessionsError) throw new Error(sessionsError.message)
  const typedSessions = (sessions ?? []) as unknown as Session[]

  // Step 3: Bulk fetch all related data in parallel
  onProgress(20, 'Fetching all campaign data...')

  const sessionIds = typedSessions.map(s => s.id)

  // First batch: tables that have campaign_id directly
  const [
    timelineBlocksResult,
    pcsResult,
    npcsResult,
    monstersResult,
    spellsResult,
    itemsResult,
    locationsResult,
    handoutsResult,
    battlesResult,
  ] = await Promise.all([
    sessionIds.length > 0
      ? supabase.from('timeline_blocks').select('*').in('session_id', sessionIds).order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('player_characters').select('*').eq('campaign_id', campaignId),
    supabase.from('npcs').select('*').eq('campaign_id', campaignId),
    supabase.from('monsters').select('*').eq('campaign_id', campaignId),
    supabase.from('spells').select('*').eq('campaign_id', campaignId),
    supabase.from('items').select('*').eq('campaign_id', campaignId),
    supabase.from('locations').select('*').eq('campaign_id', campaignId),
    supabase.from('handouts').select('*').eq('campaign_id', campaignId),
    supabase.from('battles').select('*').eq('campaign_id', campaignId),
  ])

  // Throw on any errors
  for (const [result, name] of [
    [timelineBlocksResult, 'timeline_blocks'],
    [pcsResult, 'player_characters'],
    [npcsResult, 'npcs'],
    [monstersResult, 'monsters'],
    [spellsResult, 'spells'],
    [itemsResult, 'items'],
    [locationsResult, 'locations'],
    [handoutsResult, 'handouts'],
    [battlesResult, 'battles'],
  ] as Array<[{ error: { message: string } | null }, string]>) {
    if (result.error) throw new Error(`Error fetching ${name}: ${result.error.message}`)
  }

  const allTimelineBlocks = (timelineBlocksResult.data ?? []) as unknown as TimelineBlock[]
  const pcs = (pcsResult.data ?? []) as unknown as PlayerCharacter[]
  const npcs = (npcsResult.data ?? []) as unknown as NPC[]
  const monsters = (monstersResult.data ?? []) as unknown as Monster[]
  const spells = (spellsResult.data ?? []) as unknown as Spell[]
  const items = (itemsResult.data ?? []) as unknown as Item[]
  const locations = (locationsResult.data ?? []) as unknown as Location[]
  const handouts = (handoutsResult.data ?? []) as unknown as Handout[]
  const battles = (battlesResult.data ?? []) as unknown as Battle[]

  // Second batch: junction tables queried by PC/NPC IDs (these don't have campaign_id)
  const pcIds = pcs.map(pc => pc.id)
  const npcIds = npcs.map(n => n.id)

  const [pcSpellsResult, charInventoryResult, npcSpellsResult] = await Promise.all([
    pcIds.length > 0
      ? supabase.from('pc_spells').select('*, spell:spells(name)').in('pc_id', pcIds)
      : Promise.resolve({ data: [], error: null }),
    pcIds.length > 0
      ? supabase.from('character_inventory').select('*, item:items(name)').in('character_id', pcIds)
      : Promise.resolve({ data: [], error: null }),
    npcIds.length > 0
      ? supabase.from('npc_spells').select('*, spell:spells(name)').in('npc_id', npcIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  for (const [result, name] of [
    [pcSpellsResult, 'pc_spells'],
    [charInventoryResult, 'character_inventory'],
    [npcSpellsResult, 'npc_spells'],
  ] as Array<[{ error: { message: string } | null }, string]>) {
    if (result.error) throw new Error(`Error fetching ${name}: ${result.error.message}`)
  }

  const pcSpells = (pcSpellsResult.data ?? []) as unknown as Array<{ pc_id: string; spell: { name: string } | null }>
  const charInventory = (charInventoryResult.data ?? []) as unknown as Array<{ character_id: string; item: { name: string } | null; quantity: number; equipped: boolean }>
  const npcSpells = (npcSpellsResult.data ?? []) as unknown as Array<{ npc_id: string; spell: { name: string } | null }>

  // =============================================
  // campaign.md
  // =============================================

  onProgress(30, 'Writing campaign overview...')
  const counts: CampaignCounts = {
    sessions: typedSessions.length,
    characters: pcs.length,
    npcs: npcs.length,
    monsters: monsters.length,
    spells: spells.length,
    locations: locations.length,
    items: items.length,
    handouts: handouts.length,
    battles: battles.length,
  }
  folder.file('campaign.md', formatCampaign(typedCampaign, counts))

  // =============================================
  // sessions/{nn}-{slug}.md
  // =============================================

  onProgress(45, 'Writing sessions...')
  if (typedSessions.length > 0) {
    const sessionsFolder = folder.folder('sessions')!
    const sessionNames = typedSessions.map(s => s.name)
    const sessionSlugs = uniqueSlugs(sessionNames)

    for (let i = 0; i < typedSessions.length; i++) {
      const session = typedSessions[i]
      const slug = sessionSlugs[i]
      const paddedNum = padSessionNumber(session.session_number)
      const filename = `${paddedNum}-${slug}.md`

      const blocks = allTimelineBlocks.filter(b => b.session_id === session.id)
      sessionsFolder.file(filename, formatSession(session, blocks))
    }
  }

  // =============================================
  // characters/{slug}.md
  // =============================================

  onProgress(55, 'Writing player characters...')
  if (pcs.length > 0) {
    const charsFolder = folder.folder('characters')!
    const pcSlugs = uniqueSlugs(pcs.map(pc => pc.name))

    for (let i = 0; i < pcs.length; i++) {
      const pc = pcs[i]
      const slug = pcSlugs[i]

      const spellNames = pcSpells
        .filter(ps => ps.pc_id === pc.id && ps.spell?.name)
        .map(ps => ps.spell!.name)

      const inventoryItems = charInventory
        .filter(ci => ci.character_id === pc.id && ci.item?.name)
        .map(ci => ci.item!.name)

      charsFolder.file(`${slug}.md`, formatPC(pc, spellNames, inventoryItems))
    }
  }

  // =============================================
  // npcs/{slug}.md
  // =============================================

  onProgress(65, 'Writing NPCs...')
  if (npcs.length > 0) {
    const npcsFolder = folder.folder('npcs')!
    const npcSlugs = uniqueSlugs(npcs.map(n => n.name))

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i]
      const slug = npcSlugs[i]

      const spellNames = npcSpells
        .filter(ns => ns.npc_id === npc.id && ns.spell?.name)
        .map(ns => ns.spell!.name)

      npcsFolder.file(`${slug}.md`, formatNPC(npc, spellNames))
    }
  }

  // =============================================
  // monsters/{slug}.md
  // =============================================

  onProgress(72, 'Writing monsters...')
  if (monsters.length > 0) {
    const monstersFolder = folder.folder('monsters')!
    const monsterSlugs = uniqueSlugs(monsters.map(m => m.name))

    for (let i = 0; i < monsters.length; i++) {
      monstersFolder.file(`${monsterSlugs[i]}.md`, formatMonster(monsters[i]))
    }
  }

  // =============================================
  // spells/{slug}.md
  // =============================================

  onProgress(78, 'Writing spells...')
  if (spells.length > 0) {
    const spellsFolder = folder.folder('spells')!
    const spellSlugs = uniqueSlugs(spells.map(s => s.name))

    for (let i = 0; i < spells.length; i++) {
      spellsFolder.file(`${spellSlugs[i]}.md`, formatSpell(spells[i]))
    }
  }

  // =============================================
  // items/{slug}.md
  // =============================================

  onProgress(84, 'Writing items...')
  if (items.length > 0) {
    const itemsFolder = folder.folder('items')!
    const itemSlugs = uniqueSlugs(items.map(it => it.name))

    for (let i = 0; i < items.length; i++) {
      itemsFolder.file(`${itemSlugs[i]}.md`, formatItem(items[i]))
    }
  }

  // =============================================
  // locations/{slug}.md
  // =============================================

  onProgress(88, 'Writing locations...')
  if (locations.length > 0) {
    const locsFolder = folder.folder('locations')!
    const locSlugs = uniqueSlugs(locations.map(l => l.name))

    for (let i = 0; i < locations.length; i++) {
      locsFolder.file(`${locSlugs[i]}.md`, formatLocation(locations[i], locations))
    }
  }

  // =============================================
  // handouts/{slug}.md
  // =============================================

  onProgress(90, 'Writing handouts...')
  if (handouts.length > 0) {
    const handoutsFolder = folder.folder('handouts')!
    const handoutSlugs = uniqueSlugs(handouts.map(h => h.name))

    for (let i = 0; i < handouts.length; i++) {
      handoutsFolder.file(`${handoutSlugs[i]}.md`, formatHandout(handouts[i]))
    }
  }

  // =============================================
  // battles/{slug}.md
  // =============================================

  onProgress(95, 'Writing battles...')
  if (battles.length > 0) {
    const battlesFolder = folder.folder('battles')!
    const battleSlugs = uniqueSlugs(battles.map(b => b.name))

    for (let i = 0; i < battles.length; i++) {
      battlesFolder.file(`${battleSlugs[i]}.md`, formatBattle(battles[i]))
    }
  }

  onProgress(98, 'Finalizing...')
}

// =============================================
// Public: exportCampaign — single campaign, optional progress callback
// =============================================

export async function exportCampaign(
  campaignId: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  const progress = onProgress ?? ((p, s) => useExportStore.getState().setProgress(p, s))

  const zip = new JSZip()
  await exportCampaignToFolder(zip, campaignId, progress)

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })

  // Derive filename from the folder name inside the zip
  const topFolders = Object.keys(zip.files).filter(k => k.endsWith('/') && k.split('/').length === 2)
  const campaignSlug = topFolders[0]?.replace('/', '') ?? 'campaign'
  const filename = `${campaignSlug}-export.zip`

  triggerDownload(blob, filename)
}

// =============================================
// Public: exportAllCampaigns — all campaigns in one ZIP
// =============================================

export async function exportAllCampaigns(): Promise<void> {
  const store = useExportStore.getState()
  store.startExport()

  try {
    store.setProgress(2, 'Fetching all campaigns...')
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const typedCampaigns = (campaigns ?? []) as unknown as Campaign[]

    if (typedCampaigns.length === 0) {
      store.finish()
      return
    }

    const zip = new JSZip()
    const total = typedCampaigns.length

    for (let i = 0; i < typedCampaigns.length; i++) {
      const campaign = typedCampaigns[i]
      const baseProgress = Math.round((i / total) * 90)
      const nextProgress = Math.round(((i + 1) / total) * 90)

      const onProgress: ProgressCallback = (stepProgress, stepLabel) => {
        // Map [5..98] → [baseProgress..nextProgress]
        const mapped = baseProgress + Math.round(((stepProgress - 5) / 93) * (nextProgress - baseProgress))
        store.setProgress(
          Math.min(mapped, nextProgress),
          `${campaign.name} (${i + 1}/${total}) — ${stepLabel}`,
        )
      }

      await exportCampaignToFolder(zip, campaign.id, onProgress)
    }

    store.setProgress(96, 'Building ZIP file...')
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })

    store.setProgress(99, 'Triggering download...')
    triggerDownload(blob, 'book-of-tricks-export.zip')

    store.finish()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    store.fail(message)
    throw err
  }
}

// =============================================
// Public: exportCampaignWithToasts — quick wrapper for campaign pages
// =============================================

export async function exportCampaignWithToasts(
  campaignId: string,
  campaignName: string,
): Promise<void> {
  const toast = useToastStore.getState()
  toast.addToast('info', `Exporting "${campaignName}"...`)

  try {
    await exportCampaign(campaignId)
    toast.addToast('success', `"${campaignName}" exported successfully`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    toast.addToast('error', `Export failed: ${message}`)
  }
}
