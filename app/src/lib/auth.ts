import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// Resolves when auth state is known (loading → false)
let resolveAuthReady: () => void
const authReady = new Promise<void>((resolve) => { resolveAuthReady = resolve })

/** Wait for auth to finish initialising. Safe to call multiple times. */
export function waitForAuth(): Promise<void> {
  return authReady
}

// Eagerly initialise auth — runs at module load time, before React mounts.
// This ensures waitForAuth() resolves before any route guard runs.
let initialized = false
function initAuth() {
  if (initialized) return
  initialized = true

  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuth.setState({
      user: session?.user ?? null,
      session,
      loading: false,
    })
    resolveAuthReady()
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({
      user: session?.user ?? null,
      session,
      loading: false,
    })
  })
}

// Kick off immediately
initAuth()

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    // Auth is already initialised eagerly above.
    // This is kept for backwards compatibility but is a no-op.
    await authReady
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? new Error(error.message) : null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
