import { EDITION_SLUGS } from '@/lib/data/editions'

const BASE_URL = 'https://api.open5e.com/v1'

interface PaginatedResponse<T> {
  count: number
  next: string | null
  results: T[]
}

export interface Open5eSpell {
  slug: string
  name: string
  desc: string
  higher_level: string
  level_int: number
  level: string
  school: string
  dnd_class: string
  casting_time: string
  range: string
  duration: string
  concentration: string
  ritual: string
  requires_verbal_components: boolean
  requires_somatic_components: boolean
  requires_material_components: boolean
  material: string
  document__slug: string
  document__title: string
}

export interface Open5eMonster {
  slug: string
  name: string
  size: string
  type: string
  alignment: string
  armor_class: number
  armor_desc: string
  hit_points: number
  hit_dice: string
  speed: Record<string, number>
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  challenge_rating: string
  actions: { name: string; desc: string; attack_bonus?: number; damage_dice?: string }[]
  special_abilities: { name: string; desc: string }[]
  reactions: string
  legendary_actions: { name: string; desc: string }[]
  legendary_desc: string
  senses: string
  languages: string
  skills: Record<string, number>
  damage_vulnerabilities: string
  damage_resistances: string
  damage_immunities: string
  condition_immunities: string
  saving_throws: Record<string, number>
  document__title: string
  document__slug: string
}

export async function searchSpells(params: {
  search?: string
  level?: number
  school?: string
  dnd_class?: string
  limit?: number
  edition?: string
  includeOtherEdition?: boolean
}): Promise<PaginatedResponse<Open5eSpell>> {
  const url = new URL(`${BASE_URL}/spells/`)
  url.searchParams.set('format', 'json')
  if (params.search) url.searchParams.set('search', params.search)
  if (params.level !== undefined) url.searchParams.set('level_int', String(params.level))
  if (params.school) url.searchParams.set('school', params.school)
  if (params.dnd_class) url.searchParams.set('dnd_class', params.dnd_class)
  if (params.edition && !params.includeOtherEdition) {
    const slug = EDITION_SLUGS[params.edition]
    if (slug) url.searchParams.set('document__slug', slug)
  }
  url.searchParams.set('limit', String(params.limit ?? 20))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}

export async function fetchAllSpells(
  onProgress?: (loaded: number, total: number) => void
): Promise<Open5eSpell[]> {
  const all: Open5eSpell[] = []
  let url: string | null = `${BASE_URL}/spells/?format=json&limit=100`

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
    const data: PaginatedResponse<Open5eSpell> = await res.json()
    all.push(...data.results)
    onProgress?.(all.length, data.count)
    url = data.next
  }

  return all
}

export async function searchMonsters(params: {
  search?: string
  edition?: string
  includeOtherEdition?: boolean
}): Promise<PaginatedResponse<Open5eMonster>> {
  const url = new URL(`${BASE_URL}/monsters/`)
  url.searchParams.set('format', 'json')
  if (params.search) url.searchParams.set('search', params.search)
  if (params.edition && !params.includeOtherEdition) {
    const slug = EDITION_SLUGS[params.edition]
    if (slug) url.searchParams.set('document__slug', slug)
  }
  url.searchParams.set('limit', '20')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}

// ─── Class Features & Racial Traits ─────────────────────

export interface Open5eClassFeature {
  slug: string
  name: string
  desc: string
  feature_class: string
  level: number
  document__title: string
  document__slug: string
}

export interface Open5eRacialTrait {
  slug: string
  name: string
  desc: string
  document__title: string
  document__slug: string
}

export async function fetchClassFeatures(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Open5eClassFeature[]> {
  const all: Open5eClassFeature[] = []
  let url: string | null = 'https://api.open5e.com/v1/classes/?format=json&limit=50'

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e API error: ${res.status}`)
    const data = await res.json()

    for (const cls of data.results) {
      if (cls.features) {
        for (const feature of cls.features) {
          all.push({
            slug: `${cls.slug}-${feature.slug || feature.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: feature.name,
            desc: feature.desc || '',
            feature_class: cls.name,
            level: feature.level || 0,
            document__title: cls.document__title || '',
            document__slug: cls.document__slug || '',
          })
        }
      }
    }

    url = data.next
    onProgress?.(all.length, data.count * 5)
  }

  return all
}

export async function fetchRacialTraits(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Open5eRacialTrait[]> {
  const all: Open5eRacialTrait[] = []
  let url: string | null = 'https://api.open5e.com/v1/races/?format=json&limit=50'

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e API error: ${res.status}`)
    const data = await res.json()

    for (const race of data.results) {
      if (race.traits) {
        all.push({
          slug: race.slug,
          name: `${race.name} Traits`,
          desc: race.traits,
          document__title: race.document__title || '',
          document__slug: race.document__slug || '',
        })
      }
      if (race.subraces) {
        for (const sub of race.subraces) {
          if (sub.traits) {
            all.push({
              slug: `${race.slug}-${sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-')}`,
              name: `${sub.name} Traits`,
              desc: sub.traits,
              document__title: sub.document__title || race.document__title || '',
              document__slug: sub.document__slug || race.document__slug || '',
            })
          }
        }
      }
    }

    url = data.next
    onProgress?.(all.length, data.count)
  }

  return all
}
