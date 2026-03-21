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
let authReady: Promise<void>
let resolveAuthReady: () => void
authReady = new Promise((resolve) => { resolveAuthReady = resolve })

/** Wait for auth to finish initialising. Safe to call multiple times. */
export function waitForAuth(): Promise<void> {
  return authReady
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({
      user: session?.user ?? null,
      session,
      loading: false,
    })
    resolveAuthReady()

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })
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
