<script setup>
import { computed, ref, watch } from 'vue'

const title = defineModel('title', { type: String, default: '' })
const category = defineModel('category', { type: String, default: '' })
const amount = defineModel('amount', { type: String, default: '' })
const spentOn = defineModel('spentOn', { type: String, default: '' })

const props = defineProps({
  categoryOptions: {
    type: Array,
    default: () => [],
  },
  maxDate: {
    type: String,
    required: true,
  },
  formError: {
    type: String,
    default: '',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['submit'])

const CUSTOM_CATEGORY_VALUE = '__custom__'
const DEFAULT_CATEGORY_OPTIONS = [
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Rent',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
]
const selectedCategory = ref('')
const customCategory = ref('')

const categoryOptionItems = computed(() => {
  const defaultSet = new Set(DEFAULT_CATEGORY_OPTIONS.map((c) => c.toLowerCase()))
  const userSet = new Set((props.categoryOptions ?? []).map((c) => String(c ?? '').trim().toLowerCase()))
  const seen = new Set()
  const out = []
  const source = [...DEFAULT_CATEGORY_OPTIONS, ...(props.categoryOptions ?? [])]
  for (const raw of source) {
    const c = String(raw ?? '').trim()
    if (!c) continue
    const key = c.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const isUserCreated = userSet.has(key) && !defaultSet.has(key)
    out.push({
      value: c,
      isUserCreated,
      label: isUserCreated ? `${c} (custom)` : c,
    })
  }
  out.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  return out
})

watch(
  [() => category.value, categoryOptionItems],
  ([value, options]) => {
    const current = String(value ?? '').trim()
    if (!current) {
      selectedCategory.value = ''
      customCategory.value = ''
      return
    }
    if (options.some((option) => option.value === current)) {
      selectedCategory.value = current
      customCategory.value = ''
      return
    }
    selectedCategory.value = CUSTOM_CATEGORY_VALUE
    customCategory.value = current
  },
  { immediate: true },
)

watch(selectedCategory, (value) => {
  if (!value) {
    category.value = ''
    return
  }
  if (value === CUSTOM_CATEGORY_VALUE) {
    category.value = customCategory.value.trim()
    return
  }
  category.value = value
})

watch(customCategory, (value) => {
  if (selectedCategory.value !== CUSTOM_CATEGORY_VALUE) return
  category.value = String(value ?? '').trim()
})
</script>

<template>
  <section class="card form-section">
    <h2 class="section-title">Add expense</h2>
    <form class="form" @submit.prevent="$emit('submit')">
      <div class="field">
        <label for="exp-title">Title</label>
        <input
          id="exp-title"
          v-model="title"
          type="text"
          autocomplete="off"
          placeholder="e.g. ABC Supermarket"
          required
        />
      </div>
      <div class="field">
        <label for="exp-category">Category</label>
        <select
          id="exp-category"
          v-model="selectedCategory"
          class="field-select"
          required
        >
          <option value="" disabled>Select a category</option>
          <option
            v-for="option in categoryOptionItems"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
          <option :value="CUSTOM_CATEGORY_VALUE">Other (type custom)</option>
        </select>
        <input
          v-if="selectedCategory === CUSTOM_CATEGORY_VALUE"
          v-model="customCategory"
          type="text"
          autocomplete="off"
          placeholder="Type custom category"
          required
        />
      </div>
      <div class="field">
        <label for="exp-amount">Amount</label>
        <input
          id="exp-amount"
          v-model="amount"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          placeholder="0.00"
          required
        />
      </div>
      <div class="field">
        <label for="exp-spent-on">Expense date</label>
        <input id="exp-spent-on" v-model="spentOn" type="date" :max="maxDate" required />
        <p class="field-hint">When you spent — can be today or an earlier day.</p>
      </div>
      <p v-if="formError" class="error">{{ formError }}</p>
      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ submitting ? 'Saving…' : 'Add expense' }}
      </button>
    </form>
  </section>
</template>

<style scoped src="../../styles/home/add-expense-section.css"></style>
