import React from 'react'
import { pdf } from '@react-pdf/renderer'
import type { Monster, NPC, Spell, PlayerCharacter, Handout } from '@/lib/types'
import { useToastStore } from '@/lib/toast'
import { slugify, padSessionNumber } from '@/lib/export/slugify'
import {
  fetchSessionById,
  fetchCampaign,
  fetchTimelineBlocks,
  fetchRecapForSession,
  fetchResolvedTimelineContent,
  fetchNPCSpells,
} from '@/lib/export/fetch-campaign-data'
import type { Item, Location, Battle } from '@/lib/export/fetch-campaign-data'
import { SessionPrepPDF } from './SessionPrepPDF'
import type { SessionPrepData } from './SessionPrepPDF'
import { MonsterPDF } from './MonsterPDF'
import { SpellPDF } from './SpellPDF'
import { NPCPDF } from './NPCPDF'
import { PCPDF } from './PCPDF'
import { ItemPDF } from './ItemPDF'
import { LocationPDF } from './LocationPDF'
import { HandoutPDF } from './HandoutPDF'
import { BattlePDF } from './BattlePDF'
import { BundlePDF } from './BundlePDF'
import type { BundleItem } from './BundlePDF'
import type { PdfTheme } from './styles'

// ---------------------------------------------------------------------------
// Re-export BundleItem for consumers
// ---------------------------------------------------------------------------

export type { BundleItem }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function renderAndDownload(
  component: React.ReactElement,
  filename: string,
): Promise<void> {
  const toast = useToastStore.getState()
  toast.addToast('info', 'Generating PDF...')
  try {
    const blob = await pdf(component).toBlob()
    triggerDownload(blob, filename)
    toast.addToast('success', 'PDF downloaded')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    toast.addToast('error', msg)
    throw err
  }
}

// ---------------------------------------------------------------------------
// generateSessionPrepPDF
// ---------------------------------------------------------------------------

export async function generateSessionPrepPDF(
  sessionId: string,
  campaignId: string,
  theme: PdfTheme,
): Promise<void> {
  const toast = useToastStore.getState()
  toast.addToast('info', 'Generating PDF...')

  try {
    // Fetch session + campaign in parallel
    const [session, campaign] = await Promise.all([
      fetchSessionById(sessionId),
      fetchCampaign(campaignId),
    ])

    // Fetch timeline blocks
    const blocks = await fetchTimelineBlocks([sessionId])

    // Fetch recap
    const recap = await fetchRecapForSession(session)

    // Resolve timeline content
    const resolved = await fetchResolvedTimelineContent(blocks)

    // Build Maps from arrays
    const resolvedMonsters = new Map(resolved.monsters.map(m => [m.id, m]))
    const resolvedNPCs = new Map(resolved.npcs.map(n => [n.id, n]))
    const resolvedSpells = new Map(resolved.spells.map(s => [s.id, s]))
    const resolvedLocations = new Map(resolved.locations.map(l => [l.id, l]))

    // Fetch NPC spell names for resolved NPCs
    const npcIds = resolved.npcs.map(n => n.id)
    const npcSpellRows = await fetchNPCSpells(npcIds)
    const npcSpellNames = new Map<string, string[]>()
    for (const row of npcSpellRows) {
      if (!row.spell?.name) continue
      const existing = npcSpellNames.get(row.npc_id) ?? []
      existing.push(row.spell.name)
      npcSpellNames.set(row.npc_id, existing)
    }

    // Build SessionPrepData
    const data: SessionPrepData = {
      session,
      campaignName: campaign.name,
      recap,
      blocks,
      resolvedMonsters,
      resolvedNPCs,
      resolvedSpells,
      resolvedLocations,
      npcSpellNames,
    }

    // Generate filename: session-03-the-dragons-lair-prep.pdf
    const paddedNum = padSessionNumber(session.session_number)
    const nameSlug = slugify(session.name)
    const filename = `session-${paddedNum}-${nameSlug}-prep.pdf`

    const blob = await pdf(<SessionPrepPDF data={data} theme={theme} />).toBlob()
    triggerDownload(blob, filename)
    toast.addToast('success', 'PDF downloaded')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    toast.addToast('error', msg)
    throw err
  }
}

// ---------------------------------------------------------------------------
// generateMonsterPDF
// ---------------------------------------------------------------------------

export async function generateMonsterPDF(
  monster: Monster,
  theme: PdfTheme,
): Promise<void> {
  const filename = `${slugify(monster.name)}.pdf`
  await renderAndDownload(<MonsterPDF monster={monster} theme={theme} />, filename)
}

// ---------------------------------------------------------------------------
// generateSpellPDF
// ---------------------------------------------------------------------------

export async function generateSpellPDF(spell: Spell, theme: PdfTheme): Promise<void> {
  const filename = `${slugify(spell.name)}.pdf`
  await renderAndDownload(<SpellPDF spell={spell} theme={theme} />, filename)
}

// ---------------------------------------------------------------------------
// generateNPCPDF
// ---------------------------------------------------------------------------

export async function generateNPCPDF(
  npc: NPC,
  spellNames: string[],
  theme: PdfTheme,
): Promise<void> {
  const filename = `${slugify(npc.name)}.pdf`
  await renderAndDownload(
    <NPCPDF npc={npc} spellNames={spellNames} theme={theme} />,
    filename,
  )
}

// ---------------------------------------------------------------------------
// generatePCPDF
// ---------------------------------------------------------------------------

export async function generatePCPDF(
  pc: PlayerCharacter,
  spellNames: string[],
  inventory: string[],
  theme: PdfTheme,
): Promise<void> {
  const filename = `${slugify(pc.name)}.pdf`
  await renderAndDownload(
    <PCPDF pc={pc} spellNames={spellNames} inventory={inventory} theme={theme} />,
    filename,
  )
}

// ---------------------------------------------------------------------------
// generateItemPDF
// ---------------------------------------------------------------------------

export async function generateItemPDF(item: Item, theme: PdfTheme): Promise<void> {
  const filename = `${slugify(item.name)}.pdf`
  await renderAndDownload(<ItemPDF item={item} theme={theme} />, filename)
}

// ---------------------------------------------------------------------------
// generateLocationPDF
// ---------------------------------------------------------------------------

export async function generateLocationPDF(
  location: Location,
  allLocations: Location[],
  theme: PdfTheme,
): Promise<void> {
  const filename = `${slugify(location.name)}.pdf`
  await renderAndDownload(
    <LocationPDF location={location} allLocations={allLocations} theme={theme} />,
    filename,
  )
}

// ---------------------------------------------------------------------------
// generateHandoutPDF
// ---------------------------------------------------------------------------

export async function generateHandoutPDF(handout: Handout, theme: PdfTheme): Promise<void> {
  const filename = `${slugify(handout.name)}.pdf`
  await renderAndDownload(<HandoutPDF handout={handout} theme={theme} />, filename)
}

// ---------------------------------------------------------------------------
// generateBattlePDF
// ---------------------------------------------------------------------------

export async function generateBattlePDF(battle: Battle, theme: PdfTheme): Promise<void> {
  const filename = `${slugify(battle.name)}.pdf`
  await renderAndDownload(<BattlePDF battle={battle} theme={theme} />, filename)
}

// ---------------------------------------------------------------------------
// generateBundlePDF
// ---------------------------------------------------------------------------

export async function generateBundlePDF(
  items: BundleItem[],
  theme: PdfTheme,
  label?: string,
): Promise<void> {
  const count = items.length
  const filename = label
    ? `${slugify(label)}-bundle-${count}-items.pdf`
    : `bundle-${count}-items.pdf`
  await renderAndDownload(<BundlePDF items={items} theme={theme} />, filename)
}
