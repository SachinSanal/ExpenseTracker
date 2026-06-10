<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppBrand from '@/components/AppBrand.vue'
import ExpenseAnalytics from '@/components/ExpenseAnalytics.vue'
import ExpenseAiAssistant from '@/components/ExpenseAiAssistant.vue'
import AddExpenseSection from '@/components/home/AddExpenseSection.vue'
import BottomTabNav from '@/components/home/BottomTabNav.vue'
import { useAuth } from '@/composables/useAuth'
import { useExpenses } from '@/composables/useExpenses'
import {
  buildMonthOptions,
  expenseOccurredOn,
  getCurrentMonthKey,
  isExpenseInMonth,
  isExpenseInYear,
  labelForMonthKey,
  parseExpenseDate,
} from '@/utils/months'

const { user, signOut } = useAuth()
const router = useRouter()
const {
  expenses,
  loading: listLoading,
  fetchExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} = useExpenses()

const title = ref('')
const category = ref('')
const amount = ref('')
const formError = ref('')
const submitting = ref(false)
const activeTab = ref('add')

const editingId = ref(null)
const editTitle = ref('')
const editCategory = ref('')
const editAmount = ref('')
const editSpentOn = ref('')
const editSubmitting = ref(false)
const deleteBusyId = ref(null)
const listActionError = ref('')

const categoryOptions = computed(() => {
  const seen = new Set()
  const out = []
  for (const e of expenses.value) {
    const c = (e.category ?? '').trim()
    if (!c || seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return out
})

const listMonthOptions = computed(() => buildMonthOptions())
const listMonthKey = ref(getCurrentMonthKey())
const listMonthLabel = computed(() =>
  labelForMonthKey(listMonthKey.value, listMonthOptions.value),
)
const currentMonthKey = computed(() => getCurrentMonthKey())
const currentMonthLabel = computed(() =>
  labelForMonthKey(currentMonthKey.value, listMonthOptions.value),
)
const currentMonthTotal = computed(() =>
  expenses.value
    .filter((e) => isExpenseInMonth(expenseOccurredOn(e), currentMonthKey.value))
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
)
const currentMonthTotalDescription = computed(() => `Spend in ${currentMonthLabel.value}`)

const listPeriodMode = ref('month')
const listYearKey = ref(String(new Date().getFullYear()))
const listCategoryFilter = ref('')
const listAmountSort = ref('default')

const listYearOptions = computed(() => {
  const currentY = new Date().getFullYear()
  const years = new Set([currentY])
  for (const e of expenses.value) {
    const d = parseExpenseDate(expenseOccurredOn(e))
    if (d) years.add(d.getFullYear())
  }
  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({ value: String(year), label: String(year) }))
})

const expensesInListPeriod = computed(() => {
  if (listPeriodMode.value === 'year') {
    return expenses.value.filter((e) =>
      isExpenseInYear(expenseOccurredOn(e), listYearKey.value),
    )
  }
  return expenses.value.filter((e) =>
    isExpenseInMonth(expenseOccurredOn(e), listMonthKey.value),
  )
})

const listCategoryFilterOptions = computed(() => {
  const seen = new Set()
  const out = []
  for (const e of expensesInListPeriod.value) {
    const c = (e.category ?? '').trim() || 'Uncategorized'
    if (seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return out
})

const filteredExpenses = computed(() => {
  let rows = expensesInListPeriod.value
  if (listCategoryFilter.value) {
    const want = listCategoryFilter.value
    rows = rows.filter((e) => {
      const c = (e.category ?? '').trim() || 'Uncategorized'
      return c === want
    })
  }
  const out = [...rows]
  if (listAmountSort.value === 'amount-desc') {
    out.sort(
      (a, b) =>
        Number(b.amount ?? 0) - Number(a.amount ?? 0) ||
        String(b.id).localeCompare(String(a.id)),
    )
  } else if (listAmountSort.value === 'amount-asc') {
    out.sort(
      (a, b) =>
        Number(a.amount ?? 0) - Number(b.amount ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )
  } else {
    out.sort((a, b) => {
      const ta = new Date(expenseOccurredOn(a)).getTime()
      const tb = new Date(expenseOccurredOn(b)).getTime()
      return tb - ta || String(b.id).localeCompare(String(a.id))
    })
  }
  return out
})

const listPeriodLabel = computed(() =>
  listPeriodMode.value === 'year' ? listYearKey.value : listMonthLabel.value,
)

const listPeriodTotal = computed(() =>
  filteredExpenses.value.reduce((s, e) => s + Number(e.amount ?? 0), 0),
)

const listTotalDescription = computed(() => {
  const period =
    listPeriodMode.value === 'year'
      ? `Spend in ${listYearKey.value}`
      : `Spend in ${listMonthLabel.value}`
  if (listCategoryFilter.value) {
    return `${period} · ${listCategoryFilter.value}`
  }
  return period
})

watch(
  [listPeriodMode, listMonthKey, listYearKey, expensesInListPeriod],
  () => {
    nextTick(() => {
      const opts = listCategoryFilterOptions.value
      if (listCategoryFilter.value && !opts.includes(listCategoryFilter.value)) {
        listCategoryFilter.value = ''
      }
    })
  },
  { deep: true },
)

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const spentOn = ref(todayIsoDate())
const maxExpenseDate = computed(() => todayIsoDate())

async function handleLogout() {
  await signOut()
  router.push({ name: 'login' })
}

async function loadExpenses() {
  const id = user.value?.id
  if (!id) return
  formError.value = ''
  try {
    await fetchExpenses(id)
  } catch (e) {
    formError.value = e?.message ?? 'Could not load expenses.'
  }
}

watch(
  () => user.value?.id,
  (id) => {
    if (id) loadExpenses()
  },
  { immediate: true },
)

function formatAmount(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatExpenseDateDisplay(row) {
  if (row.spent_on) {
    const d = parseExpenseDate(row.spent_on)
    if (d) {
      return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(d)
    }
  }
  return formatDate(row.created_at)
}

function rowToIsoDate(row) {
  if (row.spent_on) return String(row.spent_on).slice(0, 10)
  const d = new Date(row.created_at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startEdit(row) {
  listActionError.value = ''
  editingId.value = row.id
  editTitle.value = row.title ?? ''
  editCategory.value = row.category ?? ''
  editAmount.value = row.amount != null ? String(row.amount) : ''
  editSpentOn.value = rowToIsoDate(row)
}

function cancelEdit() {
  editingId.value = null
  editTitle.value = ''
  editCategory.value = ''
  editAmount.value = ''
  editSpentOn.value = ''
}

async function saveEdit() {
  listActionError.value = ''
  const t = editTitle.value.trim()
  const c = editCategory.value.trim()
  const raw = editAmount.value
  const num = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  const id = editingId.value
  const uid = user.value?.id

  if (!id || !uid) return
  if (!t || !c) {
    listActionError.value = 'Title and category are required.'
    return
  }
  if (raw === '' || raw === null || Number.isNaN(num)) {
    listActionError.value = 'Enter a valid amount.'
    return
  }
  if (num <= 0) {
    listActionError.value = 'Amount must be greater than zero.'
    return
  }
  if (!editSpentOn.value) {
    listActionError.value = 'Please choose the expense date.'
    return
  }

  editSubmitting.value = true
  try {
    await updateExpense({
      id,
      title: t,
      category: c,
      amount: num,
      userId: uid,
      spentOn: editSpentOn.value,
    })
    cancelEdit()
  } catch (e) {
    listActionError.value = e?.message ?? 'Could not update expense.'
  } finally {
    editSubmitting.value = false
  }
}

async function handleDelete(row) {
  listActionError.value = ''
  if (!window.confirm('Delete this expense? This cannot be undone.')) return
  const uid = user.value?.id
  if (!uid) return
  deleteBusyId.value = row.id
  try {
    await deleteExpense({ id: row.id, userId: uid })
    if (editingId.value === row.id) cancelEdit()
  } catch (e) {
    listActionError.value = e?.message ?? 'Could not delete expense.'
  } finally {
    deleteBusyId.value = null
  }
}

async function handleAddExpense() {
  formError.value = ''
  const t = title.value.trim()
  const c = category.value.trim()
  const raw = amount.value
  const num = typeof raw === 'string' ? parseFloat(raw) : Number(raw)

  if (!t || !c) {
    formError.value = 'Please enter title and category.'
    return
  }
  if (raw === '' || raw === null || Number.isNaN(num)) {
    formError.value = 'Please enter a valid amount.'
    return
  }
  if (num <= 0) {
    formError.value = 'Amount must be greater than zero.'
    return
  }

  const uid = user.value?.id
  if (!uid) {
    formError.value = 'Not signed in.'
    return
  }
  if (!spentOn.value) {
    formError.value = 'Please choose the expense date.'
    return
  }

  submitting.value = true
  try {
    await addExpense({
      title: t,
      category: c,
      amount: num,
      userId: uid,
      spentOn: spentOn.value,
    })
    title.value = ''
    category.value = ''
    amount.value = ''
    spentOn.value = todayIsoDate()
  } catch (e) {
    formError.value = e?.message ?? 'Could not save expense.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="top">
      <AppBrand tagline="Track your spending" />
      <button type="button" class="btn-ghost" @click="handleLogout">Log out</button>
    </header>

    <main class="main">
      <section v-show="activeTab === 'add'" class="add-month-summary">
        <div class="list-total" role="status">
          <div class="list-total-copy">
            <span class="list-total-eyebrow">This month</span>
            <span class="list-total-desc">{{ currentMonthTotalDescription }}</span>
          </div>
          <strong class="list-total-value">{{ formatAmount(currentMonthTotal) }}</strong>
        </div>
      </section>

      <AddExpenseSection
        v-show="activeTab === 'add'"
        v-model:title="title"
        v-model:category="category"
        v-model:amount="amount"
        v-model:spent-on="spentOn"
        :category-options="categoryOptions"
        :max-date="maxExpenseDate"
        :form-error="formError"
        :submitting="submitting"
        @submit="handleAddExpense"
      />

      <ExpenseAnalytics v-show="activeTab === 'insights'" :expenses="expenses" />

      <ExpenseAiAssistant
        v-show="activeTab === 'ai'"
        :expenses="expenses"
        :loading="listLoading"
      />

      <section v-show="activeTab === 'expenses'" class="card list-section">
        <div class="list-section-head">
          <h2 class="section-title list-section-title">Your expenses</h2>
          <p class="list-section-sub">Narrow by time, category, or amount order.</p>
        </div>

        <div class="list-filters-surface">
          <div class="list-view-switch" role="group" aria-label="Show expenses by">
            <button
              type="button"
              class="list-view-switch-btn"
              :class="{ active: listPeriodMode === 'month' }"
              :aria-pressed="listPeriodMode === 'month'"
              @click="listPeriodMode = 'month'"
            >
              Month
            </button>
            <button
              type="button"
              class="list-view-switch-btn"
              :class="{ active: listPeriodMode === 'year' }"
              :aria-pressed="listPeriodMode === 'year'"
              @click="listPeriodMode = 'year'"
            >
              Year
            </button>
          </div>

          <div class="list-filters-grid">
            <div
              v-if="listPeriodMode === 'month'"
              class="filter-field filter-field-span"
            >
              <label class="list-filter-label" for="list-month">Month</label>
              <select id="list-month" v-model="listMonthKey" class="list-filter-select">
                <option v-for="opt in listMonthOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div v-else class="filter-field filter-field-span">
              <label class="list-filter-label" for="list-year">Year</label>
              <select id="list-year" v-model="listYearKey" class="list-filter-select">
                <option v-for="opt in listYearOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div v-if="expenses.length" class="filter-field">
              <label class="list-filter-label" for="list-cat-filter">Category</label>
              <select id="list-cat-filter" v-model="listCategoryFilter" class="list-filter-select">
                <option value="">All categories</option>
                <option v-for="c in listCategoryFilterOptions" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </div>
            <div v-if="expenses.length" class="filter-field">
              <label class="list-filter-label" for="list-sort">Sort</label>
              <select id="list-sort" v-model="listAmountSort" class="list-filter-select">
                <option value="default">Date · newest first</option>
                <option value="amount-desc">Amount · high → low</option>
                <option value="amount-asc">Amount · low → high</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="!listLoading && expenses.length" class="list-total" role="status">
          <div class="list-total-copy">
            <span class="list-total-eyebrow">Total</span>
            <span class="list-total-desc">{{ listTotalDescription }}</span>
          </div>
          <strong class="list-total-value">{{ formatAmount(listPeriodTotal) }}</strong>
        </div>
        <p v-if="listLoading" class="muted">Loading…</p>
        <p v-else-if="!expenses.length" class="muted">No expenses yet.</p>
        <p v-else-if="!expensesInListPeriod.length" class="muted">
          No expenses in
          {{ listPeriodMode === 'year' ? listYearKey : listMonthLabel }}. Try another period or add one
          above.
        </p>
        <p v-else-if="!filteredExpenses.length" class="muted">
          No expenses match this category filter for {{ listPeriodLabel }}.
        </p>
        <template v-else>
          <p v-if="listActionError" class="error list-error">{{ listActionError }}</p>
          <ul class="list">
            <li v-for="row in filteredExpenses" :key="row.id" class="row">
              <template v-if="editingId === row.id">
                <div class="row-edit">
                  <div class="edit-fields">
                    <input
                      v-model="editTitle"
                      type="text"
                      class="edit-input"
                      aria-label="Title"
                    />
                    <input
                      v-model="editCategory"
                      type="text"
                      list="category-suggestions"
                      class="edit-input"
                      aria-label="Category"
                    />
                    <input
                      v-model="editAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputmode="decimal"
                      class="edit-input edit-amount"
                      aria-label="Amount"
                    />
                    <input
                      v-model="editSpentOn"
                      type="date"
                      :max="todayIsoDate()"
                      class="edit-input"
                      aria-label="Expense date"
                    />
                  </div>
                  <div class="row-actions">
                    <button
                      type="button"
                      class="btn-small btn-save"
                      :disabled="editSubmitting"
                      @click="saveEdit"
                    >
                      {{ editSubmitting ? 'Saving…' : 'Save' }}
                    </button>
                    <button
                      type="button"
                      class="btn-small btn-cancel"
                      :disabled="editSubmitting"
                      @click="cancelEdit"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="row-body">
                  <div class="row-main">
                    <span class="row-title">{{ row.title }}</span>
                    <span class="row-meta">{{ row.category }}</span>
                  </div>
                  <div class="row-right">
                    <span class="row-amount">{{ formatAmount(row.amount) }}</span>
                    <span class="row-date">{{ formatExpenseDateDisplay(row) }}</span>
                  </div>
                </div>
                <div class="row-actions row-actions-end">
                  <button
                    type="button"
                    class="btn-small btn-edit"
                    :disabled="
                      deleteBusyId === row.id || (editingId != null && editingId !== row.id)
                    "
                    @click="startEdit(row)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn-small btn-delete"
                    :disabled="deleteBusyId === row.id"
                    @click="handleDelete(row)"
                  >
                    {{ deleteBusyId === row.id ? 'Deleting…' : 'Delete' }}
                  </button>
                </div>
              </template>
            </li>
          </ul>
        </template>
      </section>
    </main>

    <p class="signed-in">Signed in as {{ user?.email }}</p>

    <BottomTabNav v-model="activeTab" />
  </div>
</template>

<style scoped src="../styles/home/home-view.css"></style>
