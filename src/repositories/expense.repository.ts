import { supabase } from '../lib/supabase';
import { Expense, ExpenseCategory, ExpenseType, ExpensePaymentMethod } from '../types/expense';

import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';

interface DBExpense {
  id: string;
  business_date: string;
  amount: number;
  category_id: string;
  expense_type: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DBExpenseCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const mapCategoryToUI = (dbData: DBExpenseCategory): ExpenseCategory => ({
  id: dbData.id,
  name: dbData.name,
  created_at: dbData.created_at,
});

export const expenseRepository = {
  // ==========================================
  // CATEGORIES
  // ==========================================

  getCategories: async (): Promise<RepoResult<ExpenseCategory[]>> => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
        
      if (error) return handleDbError(error);
      return { success: true, data: data.map(mapCategoryToUI) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getCategoryByName: async (name: string): Promise<RepoResult<ExpenseCategory | null>> => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .ilike('name', name)
        .limit(1)
        .maybeSingle();
        
      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapCategoryToUI(data) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  addCategory: async (name: string): Promise<RepoResult<ExpenseCategory>> => {
    try {
      const normalized = name.trim();
      if (!normalized) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } };
      
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name: normalized })
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapCategoryToUI(data) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateCategory: async (id: string, name: string): Promise<RepoResult<ExpenseCategory>> => {
    try {
      const normalized = name.trim();
      if (!normalized) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } };

      const { data, error } = await supabase
        .from('expense_categories')
        .update({ name: normalized, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapCategoryToUI(data) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteCategory: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  },

  // ==========================================
  // EXPENSES
  // ==========================================

  getExpenses: async (dateStr?: string): Promise<RepoResult<Expense[]>> => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id, business_date, amount, payment_method, expense_type, category_id, notes, created_at, updated_at,
          expense_categories ( id, name )
        `);
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDbError(error);

      // Supabase relation inference returns an array/object union here.
      // Keeping `any` avoids unsafe narrowing until generated DB types are improved.
      const mapped: Expense[] = data.map((dbData: any) => ({
        id: dbData.id,
        category: dbData.expense_categories?.name || 'Unknown',
        expense_type: dbData.expense_type as ExpenseType,
        amount: Number(dbData.amount),
        payment_method: dbData.payment_method as ExpensePaymentMethod,
        expense_date: dbData.business_date,
        notes: dbData.notes || undefined,
        created_at: dbData.created_at,
      }));

      return { success: true, data: mapped };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getExpense: async (id: string): Promise<RepoResult<Expense | null>> => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories ( id, name )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };

      const mapped: Expense = {
        id: data.id,
        category: data.expense_categories?.name || 'Unknown',
        expense_type: data.expense_type as ExpenseType,
        amount: Number(data.amount),
        payment_method: data.payment_method as ExpensePaymentMethod,
        expense_date: data.business_date,
        notes: data.notes || undefined,
        created_at: data.created_at,
      };

      return { success: true, data: mapped };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createExpense: async (expenseData: {
    category: string;
    expense_type: ExpenseType;
    amount: number;
    payment_method: ExpensePaymentMethod;
    expense_date: string;
    notes?: string;
  }): Promise<RepoResult<Expense>> => {
    try {
      if (!expenseData.amount || expenseData.amount <= 0) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than 0' } };
      }
      if (!expenseData.expense_date) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Business date is required' } };
      }

      let categoryId = '';
      const catRes = await expenseRepository.getCategoryByName(expenseData.category);
      if (catRes.success && catRes.data) {
        categoryId = catRes.data.id;
      } else {
        const newCatRes = await expenseRepository.addCategory(expenseData.category);
        if (!newCatRes.success || !newCatRes.data) {
          return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Failed to create or find category' } };
        }
        categoryId = newCatRes.data.id;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          business_date: expenseData.expense_date,
          amount: expenseData.amount,
          category_id: categoryId,
          expense_type: expenseData.expense_type,
          payment_method: expenseData.payment_method,
          notes: expenseData.notes || null,
        })
        .select(`
          *,
          expense_categories ( id, name )
        `)
        .single();

      if (error) return handleDbError(error);

      const mapped: Expense = {
        id: data.id,
        category: data.expense_categories?.name || 'Unknown',
        expense_type: data.expense_type as ExpenseType,
        amount: Number(data.amount),
        payment_method: data.payment_method as ExpensePaymentMethod,
        expense_date: data.business_date,
        notes: data.notes || undefined,
        created_at: data.created_at,
      };

      return { success: true, data: mapped };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateExpense: async (id: string, updates: {
    category: string;
    expense_type: ExpenseType;
    amount: number;
    payment_method: ExpensePaymentMethod;
    expense_date: string;
    notes?: string;
  }): Promise<RepoResult<Expense>> => {
    try {
      if (updates.amount !== undefined && updates.amount <= 0) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than 0' } };
      }

      let categoryId = '';
      const catRes = await expenseRepository.getCategoryByName(updates.category);
      if (catRes.success && catRes.data) {
        categoryId = catRes.data.id;
      } else {
        const newCatRes = await expenseRepository.addCategory(updates.category);
        if (!newCatRes.success || !newCatRes.data) {
          return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Failed to create or find category' } };
        }
        categoryId = newCatRes.data.id;
      }

      const { data, error } = await supabase
        .from('expenses')
        .update({
          business_date: updates.expense_date,
          amount: updates.amount,
          category_id: categoryId,
          expense_type: updates.expense_type,
          payment_method: updates.payment_method,
          notes: updates.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          expense_categories ( id, name )
        `)
        .single();

      if (error) return handleDbError(error);

      const mapped: Expense = {
        id: data.id,
        category: data.expense_categories?.name || 'Unknown',
        expense_type: data.expense_type as ExpenseType,
        amount: Number(data.amount),
        payment_method: data.payment_method as ExpensePaymentMethod,
        expense_date: data.business_date,
        notes: data.notes || undefined,
        created_at: data.created_at,
      };

      return { success: true, data: mapped };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteExpense: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
