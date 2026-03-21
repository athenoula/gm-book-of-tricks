// extension/lib/supabase.js
// Note: anon key is public by design. RLS enforces all access control.
// These values must match what's in app/.env

const SUPABASE_URL = 'https://bytlbwwkglhfidrohneu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dGxid3drZ2xoZmlkcm9obmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTIxNjYsImV4cCI6MjA4OTU4ODE2Nn0.irtbXJGH1saT-_VwsYIDaTLXovXpyq0tHveVxcbJwIA'

// IMPORTANT: Use `var` (not `const`) so `supabase` is attached to `window`
// and accessible from auth.js and popup.js which are loaded as separate scripts.
// `window.supabase` is the UMD namespace from supabase-client.js.
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
