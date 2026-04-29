<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppBrand from '@/components/AppBrand.vue'
import ExpenseAnalytics from '@/components/ExpenseAnalytics.vue'
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
      <datalist id="category-suggestions">
        <option v-for="cat in categoryOptions" :key="cat" :value="cat" />
      </datalist>
      <section class="card form-section">
        <h2 class="section-title">Add expense</h2>
        <form class="form" @submit.prevent="handleAddExpense">
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
            <input
              id="exp-category"
              v-model="category"
              type="text"
              list="category-suggestions"
              autocomplete="off"
              placeholder="Pick or type a category"
              required
            />
            <p v-if="categoryOptions.length" class="field-hint">
              Suggestions from your expenses — you can still type a new category.
            </p>
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
            <input
              id="exp-spent-on"
              v-model="spentOn"
              type="date"
              :max="todayIsoDate()"
              required
            />
            <p class="field-hint">When you spent — can be today or an earlier day.</p>
          </div>
          <p v-if="formError" class="error">{{ formError }}</p>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Saving…' : 'Add expense' }}
          </button>
        </form>
      </section>

      <ExpenseAnalytics :expenses="expenses" />

      <section class="card list-section">
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
            <span class="list-total-eyebrow">Total shown</span>
            <span class="list-total-desc">{{ listTotalDescription }}</span>
          </div>
          <strong class="list-total-value">{{ formatAmount(listPeriodTotal) }}</strong>
        </div>
        <p v-if="listLoading" class="muted">Loading…</p>
        <p v-else-if="!expenses.length" class="muted">No expenses yet. Add one above.</p>
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
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 1.25rem;
  max-width: 640px;
  margin: 0 auto;
}
.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.top :deep(.brand) {
  text-align: left;
  margin-bottom: 0;
}
.btn-ghost {
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.card {
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
}
.section-title {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
}
.card.list-section {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.055) 0%,
    rgba(255, 255, 255, 0.02) 48%,
    rgba(99, 102, 241, 0.04) 100%
  );
  border-color: rgba(255, 255, 255, 0.11);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}
.list-section-head {
  margin-bottom: 1rem;
}
.list-section-title {
  margin: 0 0 0.25rem;
  letter-spacing: -0.02em;
}
.list-section-sub {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  opacity: 0.62;
  font-weight: 400;
}
.list-filters-surface {
  padding: 0.95rem 1rem 1rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  margin-bottom: 1rem;
}
.list-view-switch {
  display: flex;
  width: 100%;
  max-width: 16rem;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
}
.list-view-switch-btn {
  flex: 1;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.02em;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.list-view-switch-btn + .list-view-switch-btn {
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}
.list-view-switch-btn:hover {
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.04);
}
.list-view-switch-btn.active {
  color: #fff;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.55) 0%, rgba(79, 70, 229, 0.45) 100%);
}
.list-filters-grid {
  display: grid;
  gap: 0.85rem 1rem;
  margin-top: 0.95rem;
  grid-template-columns: 1fr;
}
@media (min-width: 520px) {
  .list-filters-grid {
    grid-template-columns: 1fr 1fr;
  }
  .filter-field-span {
    grid-column: 1 / -1;
  }
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}
.list-filter-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}
.list-filter-select {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 0.75rem;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
  border-radius: 8px;
  /* Dark control + dark popup hint — matches the panel; option colors help Chrome/Edge. */
  color-scheme: dark;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.06);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  background-size: 1rem;
  color: rgba(248, 250, 252, 0.95);
  cursor: pointer;
  appearance: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.list-filter-select option {
  color: #f1f5f9;
  background-color: #1e293b;
}
.list-filter-select:hover {
  border-color: rgba(129, 140, 248, 0.45);
  background-color: rgba(255, 255, 255, 0.1);
}
.list-filter-select:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.65);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.list-total {
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.28);
  background: linear-gradient(
    125deg,
    rgba(99, 102, 241, 0.14) 0%,
    rgba(99, 102, 241, 0.06) 55%,
    rgba(0, 0, 0, 0.12) 100%
  );
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  border-left: 4px solid rgba(129, 140, 248, 0.85);
}
.list-total-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.list-total-eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(165, 180, 252, 0.95);
}
.list-total-desc {
  font-size: 0.8125rem;
  line-height: 1.35;
  opacity: 0.82;
}
.list-total-value {
  font-variant-numeric: tabular-nums;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #e0e7ff;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.field label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
}
.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  opacity: 0.65;
  line-height: 1.35;
}
.field input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}
.error {
  color: #f87171;
  font-size: 0.875rem;
  margin: 0;
}
.btn-primary {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.65rem;
  font-weight: 600;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.muted {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.65;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.row:last-child {
  border-bottom: none;
}
.row-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}
.row-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.row-title {
  font-weight: 500;
}
.row-meta {
  font-size: 0.8rem;
  opacity: 0.7;
}
.row-right {
  text-align: right;
  flex-shrink: 0;
}
.row-amount {
  display: block;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.row-date {
  display: block;
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 0.2rem;
}
.list-error {
  margin-bottom: 0.75rem;
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.row-actions-end {
  align-self: flex-end;
}
.btn-small {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-edit:hover:not(:disabled) {
  border-color: #646cff;
}
.btn-delete {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
}
.btn-delete:hover:not(:disabled) {
  border-color: #f87171;
}
.btn-save {
  font-weight: 600;
}
.btn-cancel {
  background: transparent;
}
.row-edit {
  width: 100%;
}
.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.edit-input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  font-size: 0.95rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}
.edit-amount {
  max-width: 10rem;
}
.signed-in {
  margin: 1.5rem 0 0;
  font-size: 0.8rem;
  opacity: 0.55;
  text-align: center;
}
@media (prefers-color-scheme: light) {
  .btn-ghost {
    border-color: rgba(0, 0, 0, 0.15);
  }
  .card.list-section {
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(248, 250, 252, 0.98) 100%
    );
    border-color: rgba(0, 0, 0, 0.08);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
  }
  .list-section-sub {
    color: rgba(15, 23, 42, 0.55);
  }
  .list-filters-surface {
    background: rgba(15, 23, 42, 0.04);
    border-color: rgba(0, 0, 0, 0.08);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .list-view-switch {
    border-color: rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.85);
  }
  .list-view-switch-btn {
    color: rgba(15, 23, 42, 0.55);
  }
  .list-view-switch-btn + .list-view-switch-btn {
    border-left-color: rgba(0, 0, 0, 0.08);
  }
  .list-view-switch-btn:hover {
    color: #0f172a;
    background: rgba(0, 0, 0, 0.03);
  }
  .list-view-switch-btn.active {
    color: #fff;
    background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  }
  .list-filter-label {
    color: rgba(15, 23, 42, 0.45);
  }
  .list-filter-select {
    color-scheme: light;
    border-color: rgba(0, 0, 0, 0.12);
    background-color: #fff;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    color: #0f172a;
  }
  .list-filter-select option {
    color: #0f172a;
    background-color: #fff;
  }
  .list-filter-select:hover {
    border-color: rgba(99, 102, 241, 0.35);
    background-color: #fff;
  }
  .list-total {
    border-color: rgba(99, 102, 241, 0.25);
    border-left-color: #6366f1;
    background: linear-gradient(
      125deg,
      rgba(99, 102, 241, 0.1) 0%,
      rgba(255, 255, 255, 0.9) 70%
    );
  }
  .list-total-eyebrow {
    color: #4338ca;
  }
  .list-total-desc {
    color: rgba(15, 23, 42, 0.65);
  }
  .list-total-value {
    color: #312e81;
  }
}
</style>
