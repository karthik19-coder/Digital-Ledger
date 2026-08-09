import { supabase } from '../lib/supabase';
import { Vendor, VendorTransaction } from '../types/vendor';

import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { mapPaymentMethodToUI, mapPaymentMethodToDB } from './shared/mapperHelpers';
export interface DBVendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor_transactions?: {
    amount: number;
    type: 'Purchase' | 'Payment';
  }[];
}

export interface DBVendorTransaction {
  id: string;
  vendor_id: string;
  business_date: string;
  amount: number;
  type: 'Purchase' | 'Payment';
  payment_method: 'Cash' | 'UPI' | 'Bank' | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapTransactionTypeToUI = (type: string): 'purchase' | 'payment' => {
  return type === 'Purchase' ? 'purchase' : 'payment';
};
const mapTransactionTypeToDB = (type: string): 'Purchase' | 'Payment' => {
  return type === 'purchase' ? 'Purchase' : 'Payment';
};



const mapVendorToUI = (dbData: DBVendor): Vendor => {
  let total_due = 0;
  if (dbData.vendor_transactions) {
    total_due = dbData.vendor_transactions.reduce((sum, tx) => {
      const amount = Number(tx.amount);
      return tx.type === 'Purchase' ? sum + amount : sum - amount;
    }, 0);
  }

  return {
    id: dbData.id,
    name: dbData.name,
    phone: dbData.phone || undefined,
    address: dbData.address || undefined,
    is_active: dbData.is_active,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at,
    total_due: Math.max(0, total_due),
  } as Vendor;
};

const mapVendorToDB = (uiData: Partial<Vendor>): Partial<DBVendor> => {
  const dbData: Partial<DBVendor> = {};
  if (uiData.name !== undefined) dbData.name = uiData.name;
  if (uiData.phone !== undefined) dbData.phone = uiData.phone || null;
  if (uiData.address !== undefined) dbData.address = uiData.address || null;
  return dbData;
};

const mapTransactionToUI = (dbData: DBVendorTransaction): VendorTransaction => ({
  id: dbData.id,
  vendor_id: dbData.vendor_id,
  type: mapTransactionTypeToUI(dbData.type),
  payment_method: mapPaymentMethodToUI(dbData.payment_method),
  amount: Number(dbData.amount),
  reference: dbData.reference_id || undefined,
  reference_type: dbData.reference_type || undefined,
  notes: dbData.notes || undefined,
  business_date: dbData.business_date,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});

export const vendorRepository = {
  getVendors: async (): Promise<RepoResult<Vendor[]>> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`*, vendor_transactions(amount, type)`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapVendorToUI(row as unknown as DBVendor)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getVendor: async (id: string): Promise<RepoResult<Vendor | null>> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`*, vendor_transactions(amount, type)`)
        .eq('id', id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();
        
      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapVendorToUI(data as unknown as DBVendor) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  searchVendors: async (query: string): Promise<RepoResult<Vendor[]>> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`*, vendor_transactions(amount, type)`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .ilike('name', `%${query}%`)
        .order('name');
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapVendorToUI(row as unknown as DBVendor)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createVendor: async (vendorData: Partial<Vendor>): Promise<RepoResult<Vendor>> => {
    try {
      const dbPayload = mapVendorToDB(vendorData);
      const { data, error } = await supabase
        .from('vendors')
        .insert([dbPayload])
        .select(`*, vendor_transactions(amount, type)`)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapVendorToUI(data as unknown as DBVendor) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateVendor: async (id: string, updates: Partial<Vendor>): Promise<RepoResult<Vendor>> => {
    try {
      const dbPayload = mapVendorToDB(updates);
      
      const { data, error } = await supabase
        .from('vendors')
        .update(dbPayload)
        .eq('id', id)
        .select(`*, vendor_transactions(amount, type)`)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapVendorToUI(data as unknown as DBVendor) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteVendor: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ 
          is_active: false, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getVendorTransactions: async (vendorId: string): Promise<RepoResult<VendorTransaction[]>> => {
    try {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapTransactionToUI(row as DBVendorTransaction)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getAllVendorTransactions: async (dateStr?: string): Promise<RepoResult<VendorTransaction[]>> => {
    try {
      let query = supabase
        .from('vendor_transactions')
        .select('id, vendor_id, business_date, amount, type, payment_method, reference_id, reference_type, notes, created_at, updated_at');
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapTransactionToUI(row as DBVendorTransaction)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  addTransaction: async (
    vendorId: string, 
    amount: number, 
    business_date: string, 
    type: 'purchase' | 'payment',
    payment_method?: 'Cash' | 'UPI' | 'Bank',
    reference?: string, 
    notes?: string,
    reference_type?: string
  ): Promise<RepoResult<VendorTransaction>> => {
    try {
      const dbPayload: Partial<DBVendorTransaction> = {
        vendor_id: vendorId,
        amount: amount,
        business_date: business_date,
        type: mapTransactionTypeToDB(type),
        payment_method: mapPaymentMethodToDB(payment_method),
        reference_id: reference && reference.trim() !== '' ? reference : null,
        reference_type: reference_type && reference_type.trim() !== '' ? reference_type : null,
        notes: notes && notes.trim() !== '' ? notes : null
      };

      const { data, error } = await supabase
        .from('vendor_transactions')
        .insert([dbPayload])
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapTransactionToUI(data as DBVendorTransaction) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateTransaction: async (
    transactionId: string,
    updates: { amount?: number; notes?: string; payment_method?: 'Cash' | 'UPI' | 'Bank' }
  ): Promise<RepoResult<VendorTransaction>> => {
    try {
      const dbPayload: Partial<DBVendorTransaction> = {};
      if (updates.amount !== undefined) dbPayload.amount = updates.amount;
      if (updates.notes !== undefined) dbPayload.notes = updates.notes;
      if (updates.payment_method !== undefined) dbPayload.payment_method = mapPaymentMethodToDB(updates.payment_method);
      
      const { data, error } = await supabase
        .from('vendor_transactions')
        .update(dbPayload)
        .eq('id', transactionId)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapTransactionToUI(data as DBVendorTransaction) };
    } catch (e) {
      return handleDbError(e);
    }
  },
  
  deleteTransaction: async (transactionId: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('vendor_transactions')
        .delete()
        .eq('id', transactionId);
        
      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  },
  
  getDailyPaymentTotals: async (): Promise<RepoResult<{ cash: number; upi: number; bank: number; total: number; date: string }[]>> => {
    try {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select('business_date, amount, payment_method')
        .eq('type', 'Payment');
        
      if (error) return handleDbError(error);
      
      const totalsMap: Record<string, { cash: number; upi: number; bank: number; total: number; date: string }> = {};
      
      (data || []).forEach(row => {
        const date = row.business_date;
        if (!totalsMap[date]) {
          totalsMap[date] = { cash: 0, upi: 0, bank: 0, total: 0, date };
        }
        
        const amount = Number(row.amount);
        totalsMap[date].total += amount;
        
        if (row.payment_method === 'Cash') totalsMap[date].cash += amount;
        if (row.payment_method === 'UPI') totalsMap[date].upi += amount;
        if (row.payment_method === 'Bank') totalsMap[date].bank += amount;
      });
      
      return { success: true, data: Object.values(totalsMap) };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
