<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

function setTab(tab) {
  if (props.modelValue === tab) return
  emit('update:modelValue', tab)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Primary sections">
    <button
      type="button"
      class="bottom-nav-btn"
      :class="{ active: modelValue === 'add' }"
      :aria-pressed="modelValue === 'add'"
      @click="setTab('add')"
    >
      <span class="bottom-nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span>Add expense</span>
    </button>
    <button
      type="button"
      class="bottom-nav-btn"
      :class="{ active: modelValue === 'insights' }"
      :aria-pressed="modelValue === 'insights'"
      @click="setTab('insights')"
    >
      <span class="bottom-nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M4 19V5M8 19v-8M12 19v-3M16 19v-6M20 19v-12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span>Insights</span>
    </button>
    <button
      type="button"
      class="bottom-nav-btn"
      :class="{ active: modelValue === 'expenses' }"
      :aria-pressed="modelValue === 'expenses'"
      @click="setTab('expenses')"
    >
      <span class="bottom-nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M7 6h10M7 12h10M7 18h10M4 6h.01M4 12h.01M4 18h.01"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span>Your expenses</span>
    </button>
    <button
      type="button"
      class="bottom-nav-btn"
      :class="{ active: modelValue === 'ai' }"
      :aria-pressed="modelValue === 'ai'"
      @click="setTab('ai')"
    >
      <span class="bottom-nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.9 2.7L8.6 21l-2.7.9L5 24.6l-.9-2.7L1.4 21l2.7-.9L5 17zM19 14l.7 2.1L21.8 17l-2.1.7L19 20l-.7-2.3L16.2 17l2.1-.7L19 14z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>AI</span>
    </button>
  </nav>
</template>

<style scoped src="../../styles/home/bottom-tab-nav.css"></style>
