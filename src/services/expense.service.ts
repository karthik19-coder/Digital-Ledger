import { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseSummaryData, ExpenseType } from '../types/expense';
import { isToday, isThisMonth, parseISO, isSameDay, isSameMonth } from 'date-fns';
import { expenseRepository } from '../repositories/expense.repository';

export const expenseService = {
  getCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await expenseRepository.getCategories();
    if (!res.success) throw new Error(res.error.message);
    return res.data || [];
  },

  addCategory: async (categoryName: string): Promise<ExpenseCategory[]> => {
    const categoriesRes = await expenseRepository.getCategories();
    if (categoriesRes.success && categoriesRes.data) {
      const normalized = categoryName.trim();
      if (categoriesRes.data.some((c) => c.name.toLowerCase() === normalized.toLowerCase())) {
        throw new Error('Category already exists.');
      }
    }
    const res = await expenseRepository.addCategory(categoryName);
    if (!res.success) throw new Error(res.error.message);
    return expenseService.getCategories();
  },

  updateCategory: async (id: string, newCategoryName: string): Promise<ExpenseCategory[]> => {
    const categoriesRes = await expenseRepository.getCategories();
    if (categoriesRes.success && categoriesRes.data) {
      const normalized = newCategoryName.trim();
      if (categoriesRes.data.some((c) => c.id !== id && c.name.toLowerCase() === normalized.toLowerCase())) {
        throw new Error('Category name already exists.');
      }
    }
    const res = await expenseRepository.updateCategory(id, newCategoryName);
    if (!res.success) throw new Error(res.error.message);
    return expenseService.getCategories();
  },

  deleteCategory: async (id: string): Promise<ExpenseCategory[]> => {
    const expensesRes = await expenseRepository.getExpenses();
    if (expensesRes.success && expensesRes.data) {
      // Get category to find name
      const catRes = await expenseRepository.getCategories();
      if (catRes.success && catRes.data) {
        const catToDelete = catRes.data.find(c => c.id === id);
        if (!catToDelete) throw new Error('Category not found.');
        
        const isInUse = expensesRes.data.some((e) => e.category === catToDelete.name);
        if (isInUse) {
          throw new Error('This category is currently in use.');
        }
      }
    }
    
    const res = await expenseRepository.deleteCategory(id);
    if (!res.success) throw new Error(res.error.message);
    return expenseService.getCategories();
  },

  getExpensesSummary: async (targetDateStr?: string): Promise<ExpenseSummaryData> => {
    const res = await expenseRepository.getExpenses();
    if (!res.success) throw new Error(res.error.message);
    const expenses = res.data || [];

    let todayExpenses = 0;
    let thisMonthExpenses = 0;
    let totalExpenses = 0;

    const targetDate = targetDateStr ? parseISO(targetDateStr) : new Date();

    for (const expense of expenses) {
      const amount = expense.amount || 0;
      totalExpenses += amount;

      try {
        const date = parseISO(expense.expense_date);
        if (isSameDay(date, targetDate)) {
          todayExpenses += amount;
        }
        if (isSameMonth(date, targetDate)) {
          thisMonthExpenses += amount;
        }
      } catch {
        // fallback if date parsing fails
      }
    }

    // Sort newest first; return top 5
    const sorted = [...expenses].sort(
      (a, b) =>
        new Date(b.expense_date || b.created_at).getTime() -
        new Date(a.expense_date || a.created_at).getTime()
    );
    const recentExpenses = sorted.slice(0, 5);

    return {
      todayExpenses,
      thisMonthExpenses,
      totalExpenses,
      recentExpenses,
    };
  },

  getAllExpenses: async (): Promise<Expense[]> => {
    const res = await expenseRepository.getExpenses();
    if (!res.success) throw new Error(res.error.message);
    const expenses = res.data || [];
    expenses.sort(
      (a, b) =>
        new Date(b.expense_date || b.created_at).getTime() -
        new Date(a.expense_date || a.created_at).getTime()
    );
    return expenses;
  },

  addExpense: async (data: {
    category: string;
    expense_type: ExpenseType;
    amount: number;
    payment_method: ExpensePaymentMethod;
    expense_date: string;
    reference_number?: string;
    notes?: string;
  }): Promise<Expense> => {
    const res = await expenseRepository.createExpense(data);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: data.expense_date } }));
    return res.data!;
  },

  updateExpense: async (
    id: string,
    data: {
      category: string;
      expense_type: ExpenseType;
      amount: number;
      payment_method: ExpensePaymentMethod;
      expense_date: string;
      reference_number?: string;
      notes?: string;
    }
  ): Promise<Expense> => {
    const res = await expenseRepository.updateExpense(id, data);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: data.expense_date } }));
    return res.data!;
  },

  deleteExpense: async (id: string): Promise<void> => {
    const getRes = await expenseRepository.getExpense(id);
    let deletedDate = null;
    if (getRes.success && getRes.data) {
      deletedDate = getRes.data.expense_date;
    }

    const res = await expenseRepository.deleteExpense(id);
    if (!res.success) throw new Error(res.error.message);

    if (deletedDate) {
      window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: deletedDate } }));
    }
  },
};
