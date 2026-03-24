import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const user = ref(null)
const session = ref(null)
const loading = ref(true)
let authListener = null

export function useAuth() {
  const isAuthenticated = computed(() => !!session.value)

  async function signIn(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    loading.value = false
    if (error) throw error
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
    loading.value = false
  }

  async function initAuth() {
    if (authListener) return
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    session.value = initialSession
    user.value = initialSession?.user ?? null
    loading.value = false
    authListener = supabase.auth.onAuthStateChange((_event, newSession) => {
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
    signIn,
    signUp,
    signOut,
    initAuth,
  }
}
