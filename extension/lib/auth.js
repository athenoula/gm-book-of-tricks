// extension/lib/auth.js
// Manual session management via chrome.storage.local
// (Supabase client's built-in storage requires sync getItem, chrome.storage is async)

const AUTH_STORAGE_KEY = 'supabaseSession'

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.session) {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: data.session })
  }
  return data
}

async function logout() {
  await supabase.auth.signOut()
  await chrome.storage.local.remove(AUTH_STORAGE_KEY)
}

async function restoreSession() {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY)
  const storedSession = result[AUTH_STORAGE_KEY]
  if (!storedSession) return null

  const { data, error } = await supabase.auth.setSession(storedSession)
  if (error || !data.session) {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY)
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY)
    return null
  }

  return user
}

function listenForSessionChanges() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session })
    } else {
      chrome.storage.local.remove(AUTH_STORAGE_KEY)
    }
  })
}
