import { supabase } from '../lib/supabase';
import { PayrollPayment, PaymentType, PaymentMethod } from '../services/payroll.service';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { validateAmount } from './shared/validators';

export interface DBSalaryPayment {
  id: string;
  employee_id: string;
  business_date: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBSalaryPayment): PayrollPayment => ({
  id: dbData.id,
  employee_id: dbData.employee_id,
  payment_date: dbData.business_date,
  amount: Number(dbData.amount),
  payment_type: dbData.payment_type as PaymentType,
  payment_method: dbData.payment_method as PaymentMethod,
  reference_number: dbData.reference || undefined,
  notes: dbData.notes || undefined,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});

const mapToDB = (uiData: Partial<PayrollPayment>): Partial<DBSalaryPayment> => {
  const dbData: Partial<DBSalaryPayment> = {};
  if (uiData.employee_id !== undefined) dbData.employee_id = uiData.employee_id;
  if (uiData.payment_date !== undefined) dbData.business_date = uiData.payment_date;
  if (uiData.amount !== undefined) dbData.amount = uiData.amount;
  if (uiData.payment_type !== undefined) dbData.payment_type = uiData.payment_type;
  if (uiData.payment_method !== undefined) dbData.payment_method = uiData.payment_method;
  if (uiData.reference_number !== undefined) dbData.reference = uiData.reference_number || null;
  if (uiData.notes !== undefined) dbData.notes = uiData.notes || null;
  return dbData;
};

export const salaryRepository = {
  getSalaryPayments: async (dateStr?: string): Promise<RepoResult<PayrollPayment[]>> => {
    try {
      let query = supabase
        .from('salary_payments')
        .select('id, employee_id, business_date, amount, payment_type, payment_method, reference, notes, created_at, updated_at');
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query.order('business_date', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBSalaryPayment)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getSalaryPayment: async (id: string): Promise<RepoResult<PayrollPayment>> => {
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) return handleDbError(error);
      if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Salary payment not found' } };
      
      return { success: true, data: mapToUI(data as DBSalaryPayment) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getSalaryPaymentsByEmployee: async (employeeId: string): Promise<RepoResult<PayrollPayment[]>> => {
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('employee_id', employeeId)
        .order('business_date', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBSalaryPayment)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createSalaryPayment: async (paymentData: Omit<PayrollPayment, 'id' | 'created_at' | 'updated_at'>): Promise<RepoResult<PayrollPayment>> => {
    try {
      if (!paymentData.employee_id) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID is required' } };
      if (!paymentData.payment_date) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Business date is required' } };
      if (!paymentData.payment_type) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment type is required' } };
      if (!paymentData.payment_method) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment method is required' } };
      
      validateAmount(paymentData.amount);

      const dbPayload = mapToDB(paymentData);
      
      const { data, error } = await supabase
        .from('salary_payments')
        .insert(dbPayload)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBSalaryPayment) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateSalaryPayment: async (id: string, updates: Partial<PayrollPayment>): Promise<RepoResult<PayrollPayment>> => {
    try {
      if (updates.amount !== undefined) {
        validateAmount(updates.amount);
      }

      const dbPayload = mapToDB(updates);
      const { data, error } = await supabase
        .from('salary_payments')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBSalaryPayment) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteSalaryPayment: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
