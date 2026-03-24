export interface TutorialStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  type?: 'highlight' | 'create'
  createEntity?: 'campaign' | 'session' | 'character'
  prefill?: Record<string, unknown>
  acknowledgment?: string
  mobileAlternative?: {
    target?: string
    title?: string
    content?: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }
}

export interface TutorialChapter {
  name: string
  steps: TutorialStep[]
}

export const chapters: TutorialChapter[] = [
  {
    name: 'Getting Started',
    steps: [
      {
        target: '[data-tutorial="create-campaign"]',
        title: 'Create a Campaign',
        content: "Let's create your first campaign to get started. Click the button to begin!",
        placement: 'bottom',
        route: '/home',
        type: 'create' as const,
        createEntity: 'campaign' as const,
        prefill: { name: 'My First Campaign', description: 'A practice campaign to learn the tools.' },
        acknowledgment: "You already have a campaign! We'll use **{name}** for this tour.",
        mobileAlternative: {
          content: "Let's create your first campaign to get started. Tap the button to begin!",
        },
      },
      {
        target: '[data-tutorial="create-character"]',
        title: 'Add a Character',
        content: "Every adventure needs heroes. Let's add your first player character.",
        placement: 'bottom',
        route: '/campaign/$campaignId/characters',
        type: 'create' as const,
        createEntity: 'character' as const,
        prefill: { name: 'Aldric', class: 'Fighter', level: 1 },
        acknowledgment: "You've already got characters — great! Let's keep going.",
        mobileAlternative: {
          content: "Every adventure needs heroes. Tap below to add your first player character.",
        },
      },
      {
        target: '[data-tutorial="create-session"]',
        title: 'Create a Session',
        content: "Sessions are where you prep and run your games. Let's create your first one.",
        placement: 'bottom',
        route: '/campaign/$campaignId/sessions',
        type: 'create' as const,
        createEntity: 'session' as const,
        prefill: { name: 'Session 1' },
        acknowledgment: "You already have sessions set up. Let's continue.",
        mobileAlternative: {
          content: "Sessions are where you prep and run your games. Tap below to create your first one.",
        },
      },
    ],
  },
  {
    name: 'Navigation',
    steps: [
      {
        target: '[data-tutorial="sidebar"]',
        title: 'The Sidebar',
        content: 'Your navigation hub. Each icon leads to a different section of your campaign.',
        placement: 'right',
        mobileAlternative: {
          target: '[data-tutorial="mobile-nav"]',
          title: 'Navigation Bar',
          content: 'Swipe this bar to access all sections of your campaign. Your most-used pages are right here.',
          placement: 'top',
        },
      },
      {
        target: '[data-tutorial="cmd-palette"]',
        title: 'Command Palette',
        content: 'Press Cmd+K to quickly search and jump to any entity — monsters, spells, NPCs, sessions.',
        placement: 'bottom',
        mobileAlternative: {
          target: '[data-tutorial="mobile-search"]',
          title: 'Search',
          content: 'Tap here to quickly search and jump to any entity — monsters, spells, NPCs, sessions.',
          placement: 'top',
        },
      },
      {
        target: '[data-tutorial="quick-ref"]',
        title: 'Quick Reference',
        content: 'Press Cmd+J to look up any entity without leaving your current page.',
        placement: 'bottom',
        mobileAlternative: {
          target: '[data-tutorial="mobile-ref"]',
          title: 'Quick Reference',
          content: 'Tap here to look up any entity without leaving your current page.',
          placement: 'top',
        },
      },
      {
        target: '[data-tutorial="all-campaigns"]',
        title: 'All Campaigns',
        content: 'Click here to switch between campaigns or create a new one.',
        placement: 'right',
      },
    ],
  },
  {
    name: 'Campaign Setup',
    steps: [
      {
        target: '[data-tutorial="campaign-overview"]',
        title: 'Campaign Overview',
        content: "Your campaign's home base. Sessions, plot threads, and party treasure all live here.",
        placement: 'top',
        route: '/campaign/$campaignId',
      },
      {
        target: '[data-tutorial="nav-characters"]',
        title: 'Characters',
        content: 'Manage your player characters and NPCs. Track stats, portraits, and backstories.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="nav-bestiary"]',
        title: 'Bestiary',
        content: 'Build your monster library. Create custom creatures or search the SRD for official stat blocks.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="nav-locations"]',
        title: 'Locations',
        content: 'Map out your world. Each location can be referenced in session timelines later.',
        placement: 'right',
      },
    ],
  },
  {
    name: 'Session Prep',
    steps: [
      {
        target: '[data-tutorial="sessions-list"]',
        title: 'Sessions',
        content: 'Each session gets its own timeline. Create one for your next game.',
        placement: 'top',
        route: '/campaign/$campaignId/sessions',
      },
      {
        target: '[data-tutorial="session-timeline"]',
        title: 'Session Timeline',
        content: 'Your main prep workspace. Build a sequence of scenes for your session.',
        placement: 'top',
        route: '/campaign/$campaignId/session/$sessionId',
      },
      {
        target: '[data-tutorial="scene-block"]',
        title: 'Scene Blocks',
        content: 'Each block is a scene, encounter, or note. Drag to reorder, click to expand.',
        placement: 'bottom',
        mobileAlternative: {
          content: 'Each block is a scene, encounter, or note. Tap to expand, hold and drag to reorder.',
        },
      },
      {
        target: '[data-tutorial="content-drawer"]',
        title: 'Content Drawer',
        content: 'Pull in monsters, NPCs, spells, and locations from your campaign library directly into scenes.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="session-recap"]',
        title: 'Session Recap',
        content: 'After the session, write a recap to track what happened.',
        placement: 'bottom',
      },
    ],
  },
  {
    name: 'Running the Game',
    steps: [
      {
        target: '[data-tutorial="play-mode"]',
        title: 'Session Status',
        content: 'Advance your session from Upcoming to In Progress when game time starts, then mark it Complete when you\'re done.',
        placement: 'bottom',
        route: '/campaign/$campaignId/session/$sessionId',
      },
      {
        target: '[data-tutorial="initiative-tracker"]',
        title: 'Initiative Tracker',
        content: 'Click this to open the combat tracker — manage turn order, HP, and conditions.',
        placement: 'bottom',
        mobileAlternative: {
          content: 'Tap this to open the combat tracker — manage turn order, HP, and conditions.',
        },
      },
      {
        target: '[data-tutorial="dice-roller"]',
        title: 'Dice Roller',
        content: 'Click to roll any dice expression right here — no need to leave the app.',
        placement: 'bottom',
        mobileAlternative: {
          content: 'Tap to roll any dice expression right here — no need to leave the app.',
        },
      },
      {
        target: '[data-tutorial="nav-scratchpad"]',
        title: 'Inspiration Board',
        content: 'Capture ideas on the fly. Use the Web Clipper extension to save content from the web.',
        placement: 'right',
      },
    ],
  },
]
