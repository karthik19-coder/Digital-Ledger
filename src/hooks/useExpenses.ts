import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { expenseService } from '../services/expense.service';
import { Expense } from '../types/expense';

export function useExpenses(date?: string) {
  const fetchExpenses = useCallback(async () => {
    if (!date) return [];
    const all = await expenseService.getAllExpenses();
    return all.filter(e => e.expense_date === date);
  }, [date]);

  const { data: expenses, loading, mutate: refreshExpenses } = useQueryCache(
    date ? `expenses-${date}` : null,
    fetchExpenses
  );

  const fetchSummary = useCallback(async () => {
    if (!date) return { total: 0, count: 0, categories: {} };
    const all = await expenseService.getAllExpenses();
    const filtered = all.filter(e => e.expense_date === date);
    const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
    const categories: Record<string, number> = {};
    filtered.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + (e.amount || 0);
    });
    return { total, count: filtered.length, categories };
  }, [date]);

  const { data: summary, loading: summaryLoading, mutate: refreshSummary } = useQueryCache(
    date ? `expenses-summary-${date}` : null,
    fetchSummary
  );

  const addExpense = async (data: any) => {
    const res = await expenseService.addExpense(data);
    await Promise.all([refreshExpenses(), refreshSummary()]);
    return res;
  };

  const deleteExpense = async (id: string) => {
    await expenseService.deleteExpense(id);
    await Promise.all([refreshExpenses(), refreshSummary()]);
  };

  return {
    expenses: expenses || [],
    summary: summary || { total: 0, count: 0, categories: {} },
    loading: loading || summaryLoading,
    refresh: () => Promise.all([refreshExpenses(), refreshSummary()]),
    addExpense,
    deleteExpense
  };
}
