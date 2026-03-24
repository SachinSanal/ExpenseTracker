import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

/** Match your Supabase table name (default: expenses). */
const EXPENSES_TABLE = 'expenses'

/**
 * Add column in Supabase SQL (Table Editor or SQL editor):
 *   alter table expenses add column if not exists spent_on date;
 */

export function useExpenses() {
  const expenses = ref([])
  const loading = ref(false)

  async function fetchExpenses(userId) {
    loading.value = true
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .select('id, title, category, amount, user_id, spent_on, created_at')
      .eq('user_id', userId)
      .order('spent_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    loading.value = false
    if (error) throw error
    expenses.value = data ?? []
  }

  async function addExpense({ title, category, amount, userId, spentOn }) {
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .insert({
        title: title.trim(),
        category: category.trim(),
        amount,
        user_id: userId,
        spent_on: spentOn,
      })
      .select('id, title, category, amount, user_id, spent_on, created_at')
      .single()
    if (error) throw error
    if (data) expenses.value = [data, ...expenses.value]
    return data
  }

  async function updateExpense({ id, title, category, amount, userId, spentOn }) {
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .update({
        title: title.trim(),
        category: category.trim(),
        amount,
        spent_on: spentOn,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, title, category, amount, user_id, spent_on, created_at')
      .single()
    if (error) throw error
    if (data) {
      const i = expenses.value.findIndex((e) => e.id === id)
      if (i !== -1) expenses.value[i] = data
    }
    return data
  }

  async function deleteExpense({ id, userId }) {
    const { error } = await supabase
      .from(EXPENSES_TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    expenses.value = expenses.value.filter((e) => e.id !== id)
  }

  return {
    expenses,
    loading,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
