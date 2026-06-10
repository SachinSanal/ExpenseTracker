<script setup>
import { computed, nextTick, ref } from 'vue'
import { useExpenseInsights } from '@/composables/useExpenseInsights'
import { GREETING_REPLY, isCasualGreeting } from '@/utils/aiGreeting'
import { formatAiMarkdown } from '@/utils/formatAiMarkdown'

const props = defineProps({
  expenses: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const SUGGESTED_PROMPTS = [
  'Why did I spend more this month?',
  'What is my average monthly spend?',
  'Which category costs me the most?',
  'How does this month compare to last month?',
]

const { sending, sendMessage } = useExpenseInsights()

const input = ref('')
const error = ref('')
const messages = ref([])
const chatEndRef = ref(null)

const hasExpenses = computed(() => props.expenses.length > 0)
const canSend = computed(
  () => hasExpenses.value && !props.loading && !sending.value && input.value.trim().length > 0,
)

function scrollToBottom() {
  nextTick(() => {
    chatEndRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

async function submitQuestion(text) {
  const question = (text ?? input.value).trim()
  if (!question || sending.value || !hasExpenses.value) return

  error.value = ''
  input.value = ''
  messages.value.push({ role: 'user', content: question })
  scrollToBottom()

  if (isCasualGreeting(question)) {
    messages.value.push({ role: 'assistant', content: GREETING_REPLY })
    scrollToBottom()
    return
  }

  try {
    const history = messages.value.slice(0, -1)
    const { reply } = await sendMessage(question, history)
    messages.value.push({ role: 'assistant', content: reply })
    scrollToBottom()
  } catch (e) {
    error.value = e?.message ?? 'Could not get an answer. Please try again.'
    scrollToBottom()
  }
}

function useSuggestedPrompt(prompt) {
  if (!hasExpenses.value || sending.value) return
  input.value = prompt
  submitQuestion(prompt)
}
</script>

<template>
  <section class="card ai-assistant">
    <div class="ai-head">
      <h2 class="section-title">AI assistant</h2>
      <p class="ai-sub">Ask about your spending in plain language.</p>
    </div>

    <div v-if="!loading && !hasExpenses" class="ai-empty muted">
      Add some expenses first to get insights.
    </div>

    <div v-else class="ai-suggestions" role="group" aria-label="Suggested questions">
      <button
        v-for="prompt in SUGGESTED_PROMPTS"
        :key="prompt"
        type="button"
        class="ai-chip"
        :disabled="!hasExpenses || loading || sending"
        @click="useSuggestedPrompt(prompt)"
      >
        {{ prompt }}
      </button>
    </div>

    <div v-if="messages.length" class="ai-chat" aria-live="polite">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="ai-bubble"
        :class="msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'"
      >
        <span class="ai-bubble-label">{{ msg.role === 'user' ? 'You' : 'Assistant' }}</span>
        <p v-if="msg.role === 'user'" class="ai-bubble-text">{{ msg.content }}</p>
        <div
          v-else
          class="ai-bubble-text ai-markdown"
          v-html="formatAiMarkdown(msg.content)"
        />
      </div>
      <div v-if="sending" class="ai-bubble ai-bubble-assistant ai-bubble-loading">
        <span class="ai-bubble-label">Assistant</span>
        <p class="ai-bubble-text muted">Thinking…</p>
      </div>
      <div ref="chatEndRef" class="ai-chat-end" />
    </div>

    <p v-if="error" class="error ai-error">{{ error }}</p>

    <form class="ai-form" @submit.prevent="submitQuestion()">
      <input
        v-model="input"
        type="text"
        class="ai-input"
        placeholder="Ask a question about your expenses…"
        :disabled="!hasExpenses || loading || sending"
        aria-label="Your question"
      />
      <button type="submit" class="ai-send" :disabled="!canSend">
        {{ sending ? 'Sending…' : 'Send' }}
      </button>
    </form>
  </section>
</template>

<style scoped src="../styles/home/expense-ai-assistant.css"></style>
