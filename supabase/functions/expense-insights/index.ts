import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Primary lite model has more capacity; flash is fallback when lite is busy. */
const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'] as const
const EXPENSES_TABLE = 'expenses'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ExpenseRow = {
  id: string
  title: string
  category: string
  amount: number
  user_id: string
  spent_on: string | null
  created_at: string
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

const GREETING_REPLY =
  'Hi! I can help you understand your spending. Try asking about your average monthly spend, top categories, or how this month compares to last month.'

function isCasualGreeting(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[!?.…,]+$/g, '')
    .trim()
  if (!normalized) return false

  if (
    /^(hi|hello|hey|hiya|yo|howdy|sup|thanks|thank you|thx|ty|good morning|good afternoon|good evening|how are you)$/.test(
      normalized,
    )
  ) {
    return true
  }

  const words = normalized.split(/\s+/)
  if (words.length > 4) return false

  const greetingWord =
    /^(hi|hello|hey|hiya|yo|howdy|sup|thanks|thank|you|thx|ty|good|morning|afternoon|evening|how|are|ya|there|doing)$/
  return words.every((w) => greetingWord.test(w))
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function expenseOccurredOn(e: ExpenseRow) {
  return e.spent_on ?? e.created_at
}

function parseExpenseDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function getMonthKeyFromDate(d: Date) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function getCurrentMonthKey() {
  return getMonthKeyFromDate(new Date())
}

function getLastMonthKey() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return getMonthKeyFromDate(d)
}

function getMonthBoundsFromKey(yearMonth: string) {
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

function isExpenseInMonth(dateValue: string, yearMonth: string) {
  const d = parseExpenseDate(dateValue)
  if (!d) return false
  const { start, end } = getMonthBoundsFromKey(yearMonth)
  return d >= start && d <= end
}

function labelForMonthKey(monthKey: string) {
  const [ys, ms] = monthKey.split('-')
  const y = Number(ys)
  const m = Number(ms)
  if (!y || !m) return monthKey
  const d = new Date(y, m - 1, 1)
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d)
}

function formatDateIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MONTH_BREAKDOWN_WINDOW = 24

function sumAmounts(rows: ExpenseRow[]) {
  return rows.reduce((sum, e) => sum + Number(e.amount ?? 0), 0)
}

function buildCategoryBreakdown(rows: ExpenseRow[]) {
  const map = new Map<string, number>()
  for (const e of rows) {
    const cat = (e.category ?? '').trim() || 'Uncategorized'
    const amt = Number(e.amount ?? 0)
    if (Number.isNaN(amt)) continue
    map.set(cat, (map.get(cat) ?? 0) + amt)
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      sharePct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
}

function buildMonthSnapshot(expenses: ExpenseRow[], monthKey: string) {
  const inMonth = expenses.filter((e) =>
    isExpenseInMonth(expenseOccurredOn(e), monthKey),
  )
  const total = sumAmounts(inMonth)
  return {
    key: monthKey,
    label: labelForMonthKey(monthKey),
    total: Math.round(total * 100) / 100,
    count: inMonth.length,
    byCategory: buildCategoryBreakdown(inMonth),
  }
}

function buildExpenseSummary(expenses: ExpenseRow[]) {
  const currentMonthKey = getCurrentMonthKey()
  const previousMonthKey = getLastMonthKey()

  const currentMonth = buildMonthSnapshot(expenses, currentMonthKey)
  const previousMonth = buildMonthSnapshot(expenses, previousMonthKey)

  const monthOverMonthChangePct =
    previousMonth.total > 0
      ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
      : null

  const monthlyTotals = new Map<string, number>()
  for (const e of expenses) {
    const d = parseExpenseDate(expenseOccurredOn(e))
    if (!d) continue
    const key = getMonthKeyFromDate(d)
    const amt = Number(e.amount ?? 0)
    if (Number.isNaN(amt)) continue
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + amt)
  }

  const monthsWithSpend = [...monthlyTotals.values()]
  const avgMonthlySpend =
    monthsWithSpend.length > 0
      ? monthsWithSpend.reduce((a, b) => a + b, 0) / monthsWithSpend.length
      : 0

  const monthlyBreakdown = [...monthlyTotals.keys()]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MONTH_BREAKDOWN_WINDOW)
    .map((monthKey) => buildMonthSnapshot(expenses, monthKey))

  const allTimeTotal = sumAmounts(expenses)
  const allTimeTopCategories = buildCategoryBreakdown(expenses).slice(0, 8)

  const largestExpenses = [...expenses]
    .map((e) => {
      const d = parseExpenseDate(expenseOccurredOn(e))
      return {
        title: e.title,
        category: (e.category ?? '').trim() || 'Uncategorized',
        amount: Number(e.amount ?? 0),
        date: d ? formatDateIso(d) : null,
      }
    })
    .filter((e) => !Number.isNaN(e.amount))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({ ...e, amount: Math.round(e.amount * 100) / 100 }))

  const dates = expenses
    .map((e) => parseExpenseDate(expenseOccurredOn(e)))
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    currency: 'INR',
    locale: 'en-IN',
    expenseCount: expenses.length,
    dateRange:
      dates.length > 0
        ? { from: formatDateIso(dates[0]), to: formatDateIso(dates[dates.length - 1]) }
        : null,
    allTimeTotal: Math.round(allTimeTotal * 100) / 100,
    currentMonth,
    previousMonth,
    monthOverMonthChangePct:
      monthOverMonthChangePct != null
        ? Math.round(monthOverMonthChangePct * 10) / 10
        : null,
    avgMonthlySpend: Math.round(avgMonthlySpend * 100) / 100,
    /** Per-month category totals — use this for any month-specific question. */
    monthlyBreakdown,
    /** All-time only — never use for a single month's answer. */
    allTimeTopCategories,
    largestExpenses,
  }
}

const SYSTEM_PROMPT = `You are a personal finance assistant for an expense tracker app.
Answer questions using ONLY the expense summary JSON provided.
Format all monetary amounts in Indian Rupees (INR) using the en-IN locale style (e.g. ₹1,234.56).
Be concise and helpful.

Critical data rules:
- For questions about a SPECIFIC MONTH (e.g. "May spending by category"), use ONLY that month's entry in monthlyBreakdown[].byCategory.
- NEVER use allTimeTopCategories for a single-month answer — that field is all-time totals only.
- If a category is not listed in that month's byCategory, the user spent ₹0 on it that month — do not mention it unless listing all categories with spend.
- If the requested month is not in monthlyBreakdown, say you have no recorded expenses for that month.
- Only list categories and amounts that appear in the relevant byCategory array. Do not guess or infer.

Greetings and small talk:
- If the user only says hi, hello, thanks, or similar without asking about expenses, reply in 1–2 short friendly sentences.
- Do NOT list totals, categories, or stats unless they asked a spending question.

Expense answers:
- Use markdown for readability: **bold** for labels, bullet lists with "- " for comparisons.
- Keep answers focused on what was asked.

If the data is insufficient to answer, say what you cannot determine.
Do not invent expenses, categories, or amounts not present in the summary.`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGeminiError(status: number, apiMsg: string): boolean {
  if (status === 429 || status === 503) return true
  const lower = apiMsg.toLowerCase()
  return (
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('resource exhausted') ||
    lower.includes('try again later')
  )
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  contents: { role: string; parts: { text: string }[] }[],
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    let apiMsg = ''
    try {
      const parsed = JSON.parse(errText)
      apiMsg = typeof parsed?.error?.message === 'string' ? parsed.error.message.trim() : ''
    } catch {
      apiMsg = errText.trim()
    }
    console.error(`[expense-insights] Gemini error (${model}):`, res.status, errText)
    const err = new Error(apiMsg || 'AI service unavailable.')
    ;(err as Error & { status: number; retryable: boolean }).status = res.status
    ;(err as Error & { status: number; retryable: boolean }).retryable = isRetryableGeminiError(
      res.status,
      apiMsg,
    )
    throw err
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!reply) {
    throw new Error('AI returned an empty response.')
  }
  return reply
}

async function callGemini(
  apiKey: string,
  summary: ReturnType<typeof buildExpenseSummary>,
  message: string,
  history: ChatTurn[],
) {
  const contents: { role: string; parts: { text: string }[] }[] = []

  for (const turn of history.slice(-6)) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })
  }

  contents.push({
    role: 'user',
    parts: [
      {
        text: `Expense summary:\n${JSON.stringify(summary, null, 2)}\n\nUser question: ${message}`,
      },
    ],
  })

  let lastError: Error | null = null

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await sleep(900)
        return await callGeminiModel(apiKey, model, contents)
      } catch (e) {
        const err = e as Error & { retryable?: boolean }
        lastError = err
        if (err.retryable && attempt === 0) continue
        break
      }
    }
  }

  throw new Error(
    lastError?.retryable
      ? 'AI is busy right now. Please wait a moment and try again.'
      : (lastError?.message ?? 'AI service unavailable. Please try again later.'),
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!geminiKey) {
    console.error('[expense-insights] GEMINI_API_KEY not configured')
    return jsonResponse({ error: 'AI service is not configured.' }, 503)
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[expense-insights] Supabase env missing')
    return jsonResponse({ error: 'Server configuration error.' }, 503)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  const jwt = authHeader.slice(7)

  let body: { message?: string; history?: ChatTurn[] }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const message = (body.message ?? '').trim()
  if (!message) {
    return jsonResponse({ error: 'Message is required' }, 400)
  }

  const history = Array.isArray(body.history)
    ? body.history.filter(
        (t): t is ChatTurn =>
          t &&
          typeof t === 'object' &&
          (t.role === 'user' || t.role === 'assistant') &&
          typeof t.content === 'string',
      )
    : []

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !userData?.user?.id) {
    console.error('[expense-insights] auth error:', userError?.message ?? 'no user')
    return jsonResponse(
      {
        error:
          'Unauthorized. Use a signed-in user access_token (not the anon or service role key).',
      },
      401,
    )
  }

  if (isCasualGreeting(message)) {
    return jsonResponse({ reply: GREETING_REPLY })
  }

  const userId = userData.user.id

  const { data: expenses, error: fetchError } = await supabase
    .from(EXPENSES_TABLE)
    .select('id, title, category, amount, user_id, spent_on, created_at')
    .eq('user_id', userId)
    .order('spent_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('[expense-insights] fetch error:', fetchError)
    return jsonResponse({ error: 'Could not load expenses.' }, 500)
  }

  const rows = (expenses ?? []) as ExpenseRow[]
  const summary = buildExpenseSummary(rows)

  try {
    const reply = await callGemini(geminiKey, summary, message, history)
    return jsonResponse({ reply })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI request failed.'
    return jsonResponse({ error: msg }, 502)
  }
})
