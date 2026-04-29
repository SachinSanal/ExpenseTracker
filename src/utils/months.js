/** Rolling window of months (newest first) for month selectors. */
export const MONTH_WINDOW = 24

export function getMonthKeyFromDate(d) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

export function getCurrentMonthKey() {
  return getMonthKeyFromDate(new Date())
}

export function getLastMonthKey() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return getMonthKeyFromDate(d)
}

/** @returns {{ value: string, label: string }[]} */
export function buildMonthOptions() {
  const now = new Date()
  const out = []
  for (let i = 0; i < MONTH_WINDOW; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = getMonthKeyFromDate(d)
    const label = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(d)
    out.push({ value, label })
  }
  return out
}

export function getMonthBoundsFromKey(yearMonth) {
  const [ys, ms] = yearMonth.split('-')
  const y = Number(ys)
  const m = Number(ms)
  if (!y || !m || m < 1 || m > 12) {
    return { start: new Date(0), end: new Date(0) }
  }
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0)
  const end = new Date(y, m, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Parses DB `date` (YYYY-MM-DD) or ISO timestamps in local calendar semantics.
 * @param {string|undefined|null} value
 * @returns {Date|null}
 */
export function parseExpenseDate(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Which calendar day to use for filtering / analytics: user date or legacy created_at. */
export function expenseOccurredOn(e) {
  return e.spent_on ?? e.created_at
}

export function isExpenseInMonth(dateValue, yearMonth) {
  const d = parseExpenseDate(dateValue)
  if (!d) return false
  const { start, end } = getMonthBoundsFromKey(yearMonth)
  return d >= start && d <= end
}

/** @param {string|number} year — e.g. 2026 or "2026" */
export function isExpenseInYear(dateValue, year) {
  const y = typeof year === 'number' ? year : Number(year)
  if (!Number.isFinite(y)) return false
  const d = parseExpenseDate(dateValue)
  if (!d) return false
  return d.getFullYear() === y
}

export function labelForMonthKey(monthKey, options) {
  const opt = options.find((o) => o.value === monthKey)
  return opt?.label ?? monthKey
}
