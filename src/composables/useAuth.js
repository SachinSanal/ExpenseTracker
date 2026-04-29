import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const user = ref(null)
const session = ref(null)
const loading = ref(true)
/** True after PASSWORD_RECOVERY or recovery hash in URL (for /reset-password). */
const passwordRecoveryActive = ref(false)
let authListener = null

/**
 * Calls Edge Function `revoke-user-sessions` to invalidate all refresh
 * sessions for the current user after a password change. Uses the session
 * JWT (await getSession — not synchronous). Logs and continues on failure
 * so a successful `updateUser` is not left in a bad UX state.
 */
async function revokeAllSessionsViaEdge() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  if (!baseUrl) {
    console.warn('[auth] VITE_SUPABASE_URL missing; skip revoke-user-sessions')
    return
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user?.id) {
    console.warn('[auth] getUser failed before revoke-user-sessions', userError)
    return
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (sessionError || !token) {
    console.warn('[auth] no session for revoke-user-sessions', sessionError)
    return
  }

  const url = `${baseUrl}/functions/v1/revoke-user-sessions`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userData.user.id }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn('[auth] revoke-user-sessions failed:', res.status, text)
    }
  } catch (e) {
    console.warn('[auth] revoke-user-sessions request error', e)
  }
}

function syncPasswordRecoveryFromUrl() {
  if (typeof window === 'undefined') return
  // Only treat recovery hash on the reset page — avoids re-arming the flag
  // during router navigation while the old URL still has #type=recovery.
  if (!window.location.pathname.endsWith('/reset-password')) return
  const raw = window.location.hash?.replace(/^#/, '') ?? ''
  if (new URLSearchParams(raw).get('type') === 'recovery') {
    passwordRecoveryActive.value = true
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!session.value)

  async function signIn(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    loading.value = false
    if (error) throw error
    passwordRecoveryActive.value = false
    return data
  }

  async function signUp(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signUp({ email, password })
    loading.value = false
    if (error) throw error
    return data
  }

  async function signOut() {
    loading.value = true
    await supabase.auth.signOut()
    passwordRecoveryActive.value = false
    loading.value = false
  }

  /** Sends a password-reset email. `redirectTo` must be listed in Supabase Auth URL configuration. */
  async function resetPasswordForEmail(email) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    await revokeAllSessionsViaEdge()
  }

  async function initAuth() {
    syncPasswordRecoveryFromUrl()
    if (authListener) return
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    session.value = initialSession
    user.value = initialSession?.user ?? null
    loading.value = false
    authListener = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryActive.value = true
      }
      session.value = newSession
      user.value = newSession?.user ?? null
      loading.value = false
    })
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    passwordRecoveryActive,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    initAuth,
  }
}
