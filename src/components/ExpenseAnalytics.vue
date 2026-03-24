<script setup>
import { computed, ref } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'vue-chartjs'
import {
  buildMonthOptions,
  expenseOccurredOn,
  getCurrentMonthKey,
  isExpenseInMonth,
  labelForMonthKey,
} from '@/utils/months'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  expenses: {
    type: Array,
    default: () => [],
  },
})

const CHART_COLORS = [
  'rgba(99, 102, 241, 0.9)',
  'rgba(34, 197, 94, 0.9)',
  'rgba(234, 179, 8, 0.9)',
  'rgba(249, 115, 22, 0.9)',
  'rgba(236, 72, 153, 0.9)',
  'rgba(20, 184, 166, 0.9)',
  'rgba(168, 85, 247, 0.9)',
  'rgba(239, 68, 68, 0.9)',
  'rgba(59, 130, 246, 0.9)',
  'rgba(132, 204, 22, 0.9)',
]

const monthOptions = computed(() => buildMonthOptions())

const selectedMonthKey = ref(getCurrentMonthKey())

const selectedMonthLabel = computed(() =>
  labelForMonthKey(selectedMonthKey.value, monthOptions.value),
)

const selectedMonthExpenses = computed(() =>
  props.expenses.filter((e) => isExpenseInMonth(expenseOccurredOn(e), selectedMonthKey.value)),
)

const selectedMonthTotal = computed(() =>
  selectedMonthExpenses.value.reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
)

const categoryTotals = computed(() => {
  const map = new Map()
  for (const e of selectedMonthExpenses.value) {
    const cat = (e.category ?? '').trim() || 'Uncategorized'
    const amt = Number(e.amount ?? 0)
    if (Number.isNaN(amt)) continue
    map.set(cat, (map.get(cat) ?? 0) + amt)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

const hasPieData = computed(() => categoryTotals.value.length > 0 && selectedMonthTotal.value > 0)

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n)
}

const chartData = computed(() => {
  const rows = categoryTotals.value
  const labels = rows.map(([c]) => c)
  const data = rows.map(([, v]) => v)
  const backgroundColor = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 12,
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const raw = ctx.dataset?.data?.[ctx.dataIndex]
          const value = Number(raw ?? ctx.parsed ?? 0) || 0
          const total = selectedMonthTotal.value || 1
          const pct = ((value / total) * 100).toFixed(1)
          return `${ctx.label}: ${formatCurrency(value)} (${pct}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <section class="card analytics">
    <h2 class="section-title">Insights</h2>

    <div class="month-row">
      <label class="month-label" for="insight-month">Month</label>
      <select id="insight-month" v-model="selectedMonthKey" class="month-select">
        <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
    <p class="analytics-sub">
      Totals and chart use expenses whose <strong>expense date</strong> falls in
      <strong>{{ selectedMonthLabel }}</strong>.
    </p>

    <div class="total-block">
      <p class="total-label">Total spent</p>
      <p class="total-value">{{ formatCurrency(selectedMonthTotal) }}</p>
    </div>

    <div class="chart-block">
      <h3 class="chart-title">Spending by category</h3>
      <div v-if="hasPieData" class="chart-wrap">
        <Pie :data="chartData" :options="chartOptions" />
      </div>
      <p v-else class="muted">No expenses in this month for a category breakdown.</p>
    </div>
  </section>
</template>

<style scoped>
.analytics {
  text-align: left;
}
.month-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
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
  max-width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: inherit;
  cursor: pointer;
}
.analytics-sub {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  opacity: 0.8;
}
.total-block {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.total-label {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.75;
}
.total-value {
  margin: 0.35rem 0 0;
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.chart-block {
  margin-top: 0.5rem;
}
.chart-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}
.chart-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  min-height: 260px;
}
.muted {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.65;
}
.section-title {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
}
@media (prefers-color-scheme: light) {
  .total-block {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
  }
  .month-select {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(0, 0, 0, 0.15);
  }
}
</style>
