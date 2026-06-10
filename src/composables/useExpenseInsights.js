import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const MAX_HISTORY_TURNS = 6

export function useExpenseInsights() {
  const sending = ref(false)

  async function sendMessage(message, history = []) {
    const trimmed = (message ?? '').trim()
    if (!trimmed) {
      throw new Error('Please enter a question.')
    }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
    if (!baseUrl) {
      throw new Error('App is not configured for AI insights.')
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (sessionError || !token) {
      throw new Error('You must be signed in to use the AI assistant.')
    }

    const cappedHistory = history
      .filter(
        (t) =>
          t &&
          (t.role === 'user' || t.role === 'assistant') &&
          typeof t.content === 'string' &&
          t.content.trim(),
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((t) => ({ role: t.role, content: t.content.trim() }))

    sending.value = true
    try {
      const url = `${baseUrl}/functions/v1/expense-insights`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, history: cappedHistory }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Unexpected response from AI service.')
      }

      if (!res.ok) {
        throw new Error(data?.error ?? 'Could not get an answer. Please try again.')
      }

      const reply = data?.reply?.trim()
      if (!reply) {
        throw new Error('AI returned an empty response.')
      }

      return { reply }
    } finally {
      sending.value = false
    }
  }

  return { sending, sendMessage }
}
