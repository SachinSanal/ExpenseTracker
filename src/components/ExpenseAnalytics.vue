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

/** 'chart' | 'table' — breakdown presentation when data exists */
const insightViewMode = ref('chart')

const categoryTableRows = computed(() => {
  const total = selectedMonthTotal.value || 1
  return categoryTotals.value.map(([name, amount], i) => ({
    name,
    amount,
    pct: (amount / total) * 100,
    swatch: CHART_COLORS[i % CHART_COLORS.length],
  }))
})

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

const chartOptions = computed(() => {
  const prefersLight =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  const textColor = prefersLight ? '#213547' : 'rgba(255, 255, 255, 0.87)'
  const tooltipBg = prefersLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(36, 36, 36, 0.96)'
  const tooltipBorder = prefersLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'

  return {
    responsive: true,
    maintainAspectRatio: true,
    color: textColor,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          boxWidth: 12,
          padding: 12,
          font: { size: 12 },
          generateLabels: (chart) => {
            const ds = chart.data.datasets[0]
            const labels = chart.data.labels ?? []
            if (!ds) return []
            return labels.map((rawLabel, i) => {
              const label = String(rawLabel ?? '')
              const bg = Array.isArray(ds.backgroundColor)
                ? ds.backgroundColor[i]
                : ds.backgroundColor
              const borderColor = Array.isArray(ds.borderColor)
                ? ds.borderColor[i]
                : ds.borderColor
              const borderWidth = Array.isArray(ds.borderWidth)
                ? ds.borderWidth[i]
                : (ds.borderWidth ?? 1)
              return {
                text: label,
                fillStyle: bg,
                strokeStyle: borderColor,
                lineWidth: borderWidth,
                fontColor: textColor,
                hidden: !chart.getDataVisibility(i),
                index: i,
                datasetIndex: 0,
              }
            })
          },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: tooltipBorder,
        borderWidth: 1,
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
  }
})
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
      <div class="chart-head">
        <h3 class="chart-title">Spending by category</h3>
        <div
          v-if="hasPieData"
          class="view-toggle"
          role="group"
          aria-label="Breakdown view"
        >
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: insightViewMode === 'chart' }"
            :aria-pressed="insightViewMode === 'chart'"
            @click="insightViewMode = 'chart'"
          >
            Chart
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: insightViewMode === 'table' }"
            :aria-pressed="insightViewMode === 'table'"
            @click="insightViewMode = 'table'"
          >
            Table
          </button>
        </div>
      </div>
      <template v-if="hasPieData">
        <div v-show="insightViewMode === 'chart'" class="chart-wrap">
          <Pie :data="chartData" :options="chartOptions" />
        </div>
        <div v-show="insightViewMode === 'table'" class="table-wrap">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" class="num">Amount</th>
                <th scope="col" class="num">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in categoryTableRows" :key="row.name">
                <td class="cat-cell">
                  <span class="swatch" :style="{ background: row.swatch }" aria-hidden="true" />
                  <span>{{ row.name }}</span>
                </td>
                <td class="num">{{ formatCurrency(row.amount) }}</td>
                <td class="num">{{ row.pct.toFixed(1) }}%</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td class="num">{{ formatCurrency(selectedMonthTotal) }}</td>
                <td class="num">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
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
  gap: 0.45rem;
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
  color-scheme: dark;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(248, 250, 252, 0.95);
  cursor: pointer;
}
.month-select:hover {
  border-color: rgba(129, 140, 248, 0.45);
  background: rgba(255, 255, 255, 0.1);
}
.month-select option {
  color: #f1f5f9;
  background-color: #1e293b;
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
.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.chart-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.view-toggle {
  display: inline-flex;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  flex-shrink: 0;
}
.view-toggle-btn {
  margin: 0;
  padding: 0.45rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  border: none;
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.view-toggle-btn + .view-toggle-btn {
  border-left: 1px solid rgba(255, 255, 255, 0.15);
}
.view-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.view-toggle-btn.active {
  background: rgba(99, 102, 241, 0.35);
  color: inherit;
}
.chart-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  min-height: 260px;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.15);
}
.breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}
.breakdown-table th,
.breakdown-table td {
  padding: 0.55rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.breakdown-table thead th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.8;
  font-weight: 600;
}
.breakdown-table tbody tr:last-child td {
  border-bottom: none;
}
.breakdown-table tfoot th,
.breakdown-table tfoot td {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: none;
  font-weight: 600;
  padding-top: 0.65rem;
}
.breakdown-table .num {
  text-align: right;
  white-space: nowrap;
}
.cat-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.swatch {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
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
    color-scheme: light;
    background: #fff;
    border-color: rgba(0, 0, 0, 0.15);
    color: #0f172a;
  }
  .month-select option {
    color: #0f172a;
    background-color: #fff;
  }
  .view-toggle {
    border-color: rgba(0, 0, 0, 0.15);
  }
  .view-toggle-btn {
    background: rgba(0, 0, 0, 0.04);
  }
  .view-toggle-btn + .view-toggle-btn {
    border-left-color: rgba(0, 0, 0, 0.12);
  }
  .view-toggle-btn:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  .view-toggle-btn.active {
    background: rgba(99, 102, 241, 0.22);
  }
  .table-wrap {
    border-color: rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.03);
  }
  .breakdown-table th,
  .breakdown-table td {
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }
  .breakdown-table tfoot th,
  .breakdown-table tfoot td {
    border-top-color: rgba(0, 0, 0, 0.12);
  }
  .swatch {
    border-color: rgba(0, 0, 0, 0.15);
  }
}
</style>
