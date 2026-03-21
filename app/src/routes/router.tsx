import {
  createRouter,
  createRoute,
  createRootRoute,
  createHashHistory,
  redirect,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { PageTransition } from '@/components/motion'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/campaigns/HomePage'
import { CampaignOverview } from '@/features/campaigns/CampaignOverview'
import { CampaignLayout } from '@/components/layout/CampaignLayout'
import { CharactersPage } from '@/features/characters/CharactersPage'
import { BestiaryPage } from '@/features/bestiary/BestiaryPage'
import { SpellbookPage } from '@/features/spellbook/SpellbookPage'
import { GeneratorsPage } from '@/features/generators/GeneratorsPage'
import { SessionPage } from '@/features/sessions/SessionPage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { InspirationBoard } from '@/features/scratchpad/InspirationBoard'
import { useAuth, waitForAuth } from '@/lib/auth'

// Root layout — wraps children in page transition
function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <PageTransition routeKey={pathname}>
      <Outlet />
    </PageTransition>
  )
}

const rootRoute = createRootRoute({
  component: RootComponent,
})

// Public: Login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
  beforeLoad: async () => {
    await waitForAuth()
    const { user } = useAuth.getState()
    if (user) {
      throw redirect({ to: '/home' })
    }
  },
})

// Protected: Home (campaign list)
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/home',
  component: HomePage,
  beforeLoad: async () => {
    await waitForAuth()
    const { user } = useAuth.getState()
    if (!user) {
      throw redirect({ to: '/' })
    }
  },
})

// Protected: Campaign shell
const campaignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/campaign/$campaignId',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return (
      <CampaignLayout campaignId={campaignId}>
        <Outlet />
      </CampaignLayout>
    )
  },
  beforeLoad: async () => {
    await waitForAuth()
    const { user } = useAuth.getState()
    if (!user) {
      throw redirect({ to: '/' })
    }
  },
})

// Campaign overview (index route)
const campaignOverviewRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <CampaignOverview campaignId={campaignId} />
  },
})

// Campaign sub-routes
const charactersRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/characters',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <CharactersPage campaignId={campaignId} />
  },
})

const bestiaryRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/bestiary',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <BestiaryPage campaignId={campaignId} />
  },
})

const spellbookRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/spellbook',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <SpellbookPage campaignId={campaignId} />
  },
})

const locationsRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/locations',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <LocationsPage campaignId={campaignId} />
  },
})

const generatorsRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/generators',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <GeneratorsPage campaignId={campaignId} />
  },
})

const scratchpadRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/scratchpad',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <InspirationBoard campaignId={campaignId} />
  },
})

const sessionsRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/sessions',
  component: () => {
    const { campaignId } = campaignRoute.useParams()
    return <SessionsPage campaignId={campaignId} />
  },
})

const sessionDetailRoute = createRoute({
  getParentRoute: () => campaignRoute,
  path: '/session/$sessionId',
  component: () => {
    const { campaignId, sessionId } = sessionDetailRoute.useParams()
    return <SessionPage sessionId={sessionId} campaignId={campaignId} />
  },
})

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div>
      <h2 className="text-2xl mb-4">
        <span className="mr-2">{icon}</span>
        {title}
      </h2>
      <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
        <p className="text-text-secondary">Coming in the next phase.</p>
      </div>
    </div>
  )
}

// Build the route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  homeRoute,
  campaignRoute.addChildren([
    campaignOverviewRoute,
    charactersRoute,
    bestiaryRoute,
    spellbookRoute,
    locationsRoute,
    generatorsRoute,
    scratchpadRoute,
    sessionsRoute,
    sessionDetailRoute,
  ]),
])

const hashHistory = createHashHistory()

export const router = createRouter({ routeTree, history: hashHistory })

// Type safety for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
