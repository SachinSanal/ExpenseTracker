<script setup>
import { computed, ref, watch } from 'vue'
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

const filteredExpenses = computed(() =>
  expenses.value.filter((e) => isExpenseInMonth(expenseOccurredOn(e), listMonthKey.value)),
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
        <h2 class="section-title">Your expenses</h2>
        <div class="month-row list-month-row">
          <label class="month-label" for="list-month">Month</label>
          <select id="list-month" v-model="listMonthKey" class="month-select">
            <option v-for="opt in listMonthOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <p v-if="listLoading" class="muted">Loading…</p>
        <p v-else-if="!expenses.length" class="muted">No expenses yet. Add one above.</p>
        <p v-else-if="!filteredExpenses.length" class="muted">
          No expenses in {{ listMonthLabel }}. Try another month or add one above.
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
.list-section .section-title {
  margin-bottom: 0.5rem;
}
.month-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.list-month-row {
  margin-bottom: 1rem;
}
.month-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.75;
}
.month-select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  cursor: pointer;
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
  .month-select {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(0, 0, 0, 0.15);
  }
}
</style>
