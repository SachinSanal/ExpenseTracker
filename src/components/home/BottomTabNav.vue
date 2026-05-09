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
  </nav>
</template>

<style scoped src="../../styles/home/bottom-tab-nav.css"></style>
