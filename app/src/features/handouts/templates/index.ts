import type { HandoutTemplate } from '@/lib/types'

export type TemplateConfig = {
  key: HandoutTemplate
  label: string
  emoji: string
  fields: string[]
  defaultFont: string
  fontPresets: { name: string; font: string }[]
}

export const TEMPLATE_CONFIGS: Record<HandoutTemplate, TemplateConfig> = {
  scroll: {
    key: 'scroll',
    label: 'Scroll / Letter',
    emoji: '📜',
    fields: ['title', 'body', 'signature'],
    defaultFont: "'Pinyon Script', cursive",
    fontPresets: [
      { name: 'Elegant', font: "'Pinyon Script', cursive" },
      { name: 'Hasty', font: "'Caveat', cursive" },
      { name: 'Formal', font: "'IM Fell English', serif" },
    ],
  },
  wanted: {
    key: 'wanted',
    label: 'Wanted Poster',
    emoji: '🪧',
    fields: ['heading', 'portrait', 'name', 'description', 'reward'],
    defaultFont: "'Rye', serif",
    fontPresets: [
      { name: 'Western', font: "'Rye', serif" },
      { name: 'Bold', font: "'UnifrakturMaguntia', serif" },
      { name: 'Simple', font: "'Special Elite', monospace" },
    ],
  },
  decree: {
    key: 'decree',
    label: 'Royal Decree',
    emoji: '👑',
    fields: ['title', 'body', 'signature_line', 'date'],
    defaultFont: "'IM Fell English', serif",
    fontPresets: [
      { name: 'Formal', font: "'IM Fell English', serif" },
      { name: 'Regal', font: "'Cinzel', serif" },
      { name: 'Script', font: "'Pinyon Script', cursive" },
    ],
  },
  map_note: {
    key: 'map_note',
    label: 'Map Note',
    emoji: '🗺️',
    fields: ['image', 'caption', 'annotations'],
    defaultFont: "'Caveat', cursive",
    fontPresets: [
      { name: 'Hasty', font: "'Caveat', cursive" },
      { name: 'Neat', font: "'Special Elite', monospace" },
      { name: 'Ancient', font: "'MedievalSharp', serif" },
    ],
  },
  tavern: {
    key: 'tavern',
    label: 'Tavern Menu',
    emoji: '🍺',
    fields: ['establishment_name', 'sections'],
    defaultFont: "'Special Elite', monospace",
    fontPresets: [
      { name: 'Chalk', font: "'Special Elite', monospace" },
      { name: 'Rustic', font: "'MedievalSharp', serif" },
      { name: 'Fancy', font: "'IM Fell English', serif" },
    ],
  },
  broadsheet: {
    key: 'broadsheet',
    label: 'Broadsheet',
    emoji: '📰',
    fields: ['masthead', 'date', 'headline', 'articles', 'ads'],
    defaultFont: "'IM Fell English', serif",
    fontPresets: [
      { name: 'Newsprint', font: "'IM Fell English', serif" },
      { name: 'Gothic', font: "'UnifrakturMaguntia', serif" },
      { name: 'Modern', font: "'Special Elite', monospace" },
    ],
  },
  invitation: {
    key: 'invitation',
    label: 'Invitation',
    emoji: '💌',
    fields: ['host_line', 'event_title', 'details', 'rsvp'],
    defaultFont: "'Pinyon Script', cursive",
    fontPresets: [
      { name: 'Calligraphy', font: "'Pinyon Script', cursive" },
      { name: 'Elegant', font: "'IM Fell English', serif" },
      { name: 'Whimsical', font: "'MedievalSharp', serif" },
    ],
  },
  blank: {
    key: 'blank',
    label: 'Blank Parchment',
    emoji: '📄',
    fields: ['body'],
    defaultFont: "'Caveat', cursive",
    fontPresets: [
      { name: 'Handwritten', font: "'Caveat', cursive" },
      { name: 'Script', font: "'Pinyon Script', cursive" },
      { name: 'Typewriter', font: "'Special Elite', monospace" },
      { name: 'Formal', font: "'IM Fell English', serif" },
    ],
  },
}

export const ALL_FONTS = [
  { name: 'Pinyon Script', value: "'Pinyon Script', cursive" },
  { name: 'Caveat', value: "'Caveat', cursive" },
  { name: 'IM Fell English', value: "'IM Fell English', serif" },
  { name: 'Special Elite', value: "'Special Elite', monospace" },
  { name: 'MedievalSharp', value: "'MedievalSharp', serif" },
  { name: 'Rye', value: "'Rye', serif" },
  { name: 'UnifrakturMaguntia', value: "'UnifrakturMaguntia', serif" },
  { name: 'Cinzel', value: "'Cinzel', serif" },
  { name: 'Dancing Script', value: "'Dancing Script', cursive" },
  { name: 'Satisfy', value: "'Satisfy', cursive" },
]

export const SEAL_COLOURS = [
  { name: 'Crimson', value: '#c0392b' },
  { name: 'Forest', value: '#27ae60' },
  { name: 'Navy', value: '#2c3e7b' },
  { name: 'Black', value: '#2c2c2c' },
  { name: 'Gold', value: '#b8860b' },
  { name: 'Purple', value: '#7b3fa0' },
]
