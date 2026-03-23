export interface TutorialStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string
}

export interface TutorialChapter {
  name: string
  steps: TutorialStep[]
}

export const chapters: TutorialChapter[] = [
  {
    name: 'Navigation',
    steps: [
      {
        target: '[data-tutorial="sidebar"]',
        title: 'The Sidebar',
        content: 'Your navigation hub. Each icon leads to a different section of your campaign.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="cmd-palette"]',
        title: 'Command Palette',
        content: 'Press Cmd+K to quickly search and jump to any entity — monsters, spells, NPCs, sessions.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="quick-ref"]',
        title: 'Quick Reference',
        content: 'Press Cmd+J to look up any entity without leaving your current page.',
        placement: 'bottom',
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
      },
      {
        target: '[data-tutorial="initiative-tracker"]',
        title: 'Initiative Tracker',
        content: 'Run combat encounters with turn order, HP tracking, and conditions.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="dice-roller"]',
        title: 'Dice Roller',
        content: 'Roll any dice expression right here — no need to leave the app.',
        placement: 'left',
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
