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
}

export async function searchSpells(params: {
  search?: string
  level?: number
  school?: string
  dnd_class?: string
  limit?: number
}): Promise<PaginatedResponse<Open5eSpell>> {
  const url = new URL(`${BASE_URL}/spells/`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(params.limit ?? 20))
  if (params.search) url.searchParams.set('search', params.search)
  if (params.level !== undefined) url.searchParams.set('level_int', String(params.level))
  if (params.school) url.searchParams.set('school', params.school)
  if (params.dnd_class) url.searchParams.set('dnd_class', params.dnd_class)

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

export async function searchMonsters(search: string): Promise<PaginatedResponse<Open5eMonster>> {
  const url = new URL(`${BASE_URL}/monsters/`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '20')
  url.searchParams.set('search', search)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}
