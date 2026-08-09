export type ExpenseType = 'business' | 'personal';
export type ExpensePaymentMethod = 'Cash' | 'UPI' | 'Bank';

export interface ExpenseCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  category: string;
  expense_type: ExpenseType;
  amount: number;
  payment_method: ExpensePaymentMethod;
  expense_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface ExpenseSummaryData {
  todayExpenses: number;
  thisMonthExpenses: number;
  totalExpenses: number;
  recentExpenses: Expense[];
}
