// src/features/landing/feature-data.ts
import {
  GiScrollUnfurled,
  GiCrossedSwords,
  GiSparkles,
  GiHoodedFigure,
  GiPuzzle,
  GiSpikedDragonHead,
  GiThreeFriends,
  GiPositionMarker,
  GiMagnifyingGlass,
  GiBookPile,
  GiNotebook,
  GiRollingDices,
  GiCastle,
} from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'

export interface ShowcaseFeature {
  slug: string
  category: string
  title: string
  shortDescription: string
  longDescription: string
  icon: IconComponent
  seoTitle: string
  seoDescription: string
}

export interface GridFeature {
  title: string
  description: string
  icon: IconComponent
}

export const showcaseFeatures: ShowcaseFeature[] = [
  {
    slug: 'session-timeline',
    category: 'SESSION PREP',
    title: 'Session Timeline',
    shortDescription:
      'Organize scenes, battles, NPCs, and notes into a living timeline. Drag to reorder on the fly. Everything at your fingertips mid-session.',
    longDescription:
      'The session timeline is the heart of your prep workflow. Build your session as a sequence of scenes — each one can hold markdown notes, monster stat blocks, NPC details, spell references, and full initiative tracker battles. Drag blocks to reorder when plans change. Switch from Prep to Play mode and run your session from the same view. Every piece of content you need is one click away, organized exactly the way you planned it.',
    icon: GiScrollUnfurled,
    seoTitle: 'Session Timeline | GM Book of Tricks',
    seoDescription:
      'Organize your D&D sessions with a drag-and-drop timeline. Scenes, battles, NPCs, and notes in one place. Free GM session prep tool.',
  },
  {
    slug: 'initiative-tracker',
    category: 'IN-PLAY',
    title: 'Initiative Tracker',
    shortDescription:
      'Real-time combat management with HP tracking, D&D 5e conditions, and turn order. Share with players via live sync.',
    longDescription:
      'Run combat without the spreadsheet. Add combatants with one click, roll initiative, and track HP, conditions, and turn order in real time. The tracker supports all D&D 5e conditions with visual indicators, quick-add panels for monsters from your bestiary, and automatic turn advancement. Built-in real-time sync means your players can follow along on their own devices.',
    icon: GiCrossedSwords,
    seoTitle: 'Initiative Tracker | GM Book of Tricks',
    seoDescription:
      'Free D&D initiative tracker with HP tracking, conditions, and real-time player sync. Run combat encounters smoothly.',
  },
  {
    slug: 'spellbook',
    category: 'REFERENCE',
    title: 'Spellbook',
    shortDescription:
      'Search the full D&D 5e spell list. Filter by level, school, or class. Import spells to your campaign and assign to characters.',
    longDescription:
      'Access the complete D&D 5e spell database with instant search and powerful filters. Narrow down by spell level, school of magic, or casting class. Import the spells your campaign actually uses into your personal spellbook for quick reference. Assign spells to player characters and NPCs so you always know who can cast what. Full spell details including components, duration, and description at a glance.',
    icon: GiSparkles,
    seoTitle: 'D&D 5e Spellbook | GM Book of Tricks',
    seoDescription:
      'Search and filter the complete D&D 5e spell list. Filter by level, school, and class. Import spells to your campaign. Free GM tool.',
  },
  {
    slug: 'generators',
    category: 'GENERATORS',
    title: 'NPC & Encounter Generators',
    shortDescription:
      'Random NPCs with personality, balanced encounters for any party level, and loot tables on demand. Never be caught unprepared.',
    longDescription:
      'When your players go off-script, the generators have your back. Create fully-formed NPCs with names, personalities, motivations, and appearance in one click. Build balanced encounters by selecting monsters and seeing the difficulty calculated for your party size and level. Roll on loot tables for treasure hoards and individual rewards. Every generated result can be saved directly to your campaign for future use.',
    icon: GiHoodedFigure,
    seoTitle: 'D&D NPC & Encounter Generator | GM Book of Tricks',
    seoDescription:
      'Generate random D&D NPCs, balanced encounters, and loot tables instantly. Free generator tools for Game Masters.',
  },
  {
    slug: 'web-clipper',
    category: 'UTILITY',
    title: 'Web Clipper',
    shortDescription:
      'Found a great monster stat block or map online? Clip it straight to your campaign with our browser extension. Your inspiration board fills itself.',
    longDescription:
      'The Web Clipper Chrome extension lets you capture content from anywhere on the web and send it directly to your campaign. Found a great homebrew monster on Reddit? A beautiful battle map on Pinterest? A rules clarification on a forum? Clip it with one click. Content lands in your Inspiration Board, organized and ready to drag into your next session timeline. Supports text, images, links, and full page clips.',
    icon: GiPuzzle,
    seoTitle: 'Web Clipper for D&D | GM Book of Tricks',
    seoDescription:
      'Clip D&D content from any website straight to your campaign. Chrome extension for Game Masters. Free browser extension.',
  },
]

export const gridFeatures: GridFeature[] = [
  {
    title: 'Bestiary',
    description: 'Search and import monsters with full stat blocks',
    icon: GiSpikedDragonHead,
  },
  {
    title: 'Characters',
    description: 'Manage PCs with ability scores and spell lists',
    icon: GiThreeFriends,
  },
  {
    title: 'Locations',
    description: 'Track towns, dungeons, and points of interest',
    icon: GiPositionMarker,
  },
  {
    title: 'Quick Reference',
    description: 'Rules and conditions at your fingertips',
    icon: GiMagnifyingGlass,
  },
  {
    title: "DM's Cheat Sheet",
    description: 'DCs, tables, and common rules in one place',
    icon: GiBookPile,
  },
  {
    title: 'Inspiration Board',
    description: 'Capture ideas, clips, and notes between sessions',
    icon: GiNotebook,
  },
  {
    title: 'Dice Roller',
    description: '3D dice with custom roll expressions',
    icon: GiRollingDices,
  },
  {
    title: 'Campaign Dashboard',
    description: 'Manage multiple campaigns from one place',
    icon: GiCastle,
  },
]
