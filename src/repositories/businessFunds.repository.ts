import { supabase } from '../lib/supabase';
import { BusinessFundsTransaction } from '../types/businessFunds';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { validateAmount } from './shared/validators';
import { mapPaymentMethodToUI, mapPaymentMethodToDB } from './shared/mapperHelpers';

export interface DBBusinessFund {
  id: string;
  business_date: string;
  amount: number;
  type: 'Injection' | 'Withdrawal';
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapFundTypeToUI = (type: string): 'Injection' | 'Withdrawal' => {
  return type === 'Withdrawal' ? 'Withdrawal' : 'Injection';
};

const mapFundTypeToDB = (type: string | undefined): 'Injection' | 'Withdrawal' => {
  return type === 'Withdrawal' ? 'Withdrawal' : 'Injection';
};

const mapToUI = (dbData: DBBusinessFund): BusinessFundsTransaction => ({
  id: dbData.id,
  business_date: dbData.business_date,
  amount: Number(dbData.amount),
  type: mapFundTypeToUI(dbData.type),
  payment_method: mapPaymentMethodToUI(dbData.payment_method) as 'Cash' | 'UPI' | 'Bank',
  reason: dbData.notes?.split('||')[0] || undefined,
  notes: dbData.notes?.split('||')[1] || dbData.notes || undefined,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});

const mapToDB = (uiData: Partial<BusinessFundsTransaction>): Partial<DBBusinessFund> => {
  const dbData: Partial<DBBusinessFund> = {};
  if (uiData.business_date !== undefined) dbData.business_date = uiData.business_date;
  if (uiData.amount !== undefined) dbData.amount = uiData.amount;
  if (uiData.type !== undefined) dbData.type = mapFundTypeToDB(uiData.type);
  if (uiData.payment_method !== undefined) dbData.payment_method = mapPaymentMethodToDB(uiData.payment_method) || 'Cash';
  if (uiData.reason !== undefined || uiData.notes !== undefined) {
    dbData.notes = `${uiData.reason || ''}||${uiData.notes || ''}`;
  }
  return dbData;
};

export const businessFundsRepository = {
  getBusinessFunds: async (dateStr?: string): Promise<RepoResult<BusinessFundsTransaction[]>> => {
    try {
      let query = supabase
        .from('business_funds')
        .select('id, business_date, amount, type, payment_method, notes, created_at, updated_at');
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBBusinessFund)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getBusinessFund: async (id: string): Promise<RepoResult<BusinessFundsTransaction | null>> => {
    try {
      const { data, error } = await supabase
        .from('business_funds')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: data ? mapToUI(data as DBBusinessFund) : null };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createBusinessFund: async (fundData: Partial<BusinessFundsTransaction>): Promise<RepoResult<BusinessFundsTransaction>> => {
    try {
      validateAmount(fundData.amount);
      if (!fundData.business_date) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Business date is required' } };
      if (!fundData.payment_method) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment method is required' } };

      // Default type to Injection if missing
      if (!fundData.type) fundData.type = 'Injection';

      const dbPayload = mapToDB(fundData);
      const { data, error } = await supabase
        .from('business_funds')
        .insert(dbPayload)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBBusinessFund) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateBusinessFund: async (id: string, updates: Partial<BusinessFundsTransaction>): Promise<RepoResult<BusinessFundsTransaction>> => {
    try {
      if (updates.amount !== undefined) validateAmount(updates.amount);

      const dbPayload = mapToDB(updates);
      const { data, error } = await supabase
        .from('business_funds')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBBusinessFund) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteBusinessFund: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('business_funds')
        .delete()
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
