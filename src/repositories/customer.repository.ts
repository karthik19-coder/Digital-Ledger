import { supabase } from '../lib/supabase';
import { Customer, CustomerTransaction } from '../services/customer.service';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { mapPaymentMethodToUI, mapPaymentMethodToDB } from './shared/mapperHelpers';
// DB interfaces based on the Supabase schema
export interface DBCustomer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Included when joining with customer_transactions
  customer_transactions?: {
    amount: number;
    type: 'Credit' | 'Payment';
  }[];
}

export interface DBCustomerTransaction {
  id: string;
  customer_id: string;
  business_date: string;
  amount: number;
  type: 'Credit' | 'Payment';
  payment_method: 'Cash' | 'UPI' | 'Bank' | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Maps DB enum cases ('Credit', 'Payment') to UI cases ('credit', 'payment')
const mapTransactionTypeToUI = (type: string): 'credit' | 'payment' => {
  return type === 'Credit' ? 'credit' : 'payment';
};
const mapTransactionTypeToDB = (type: string): 'Credit' | 'Payment' => {
  return type === 'credit' ? 'Credit' : 'Payment';
};


// Map customer DB row to UI interface
const mapCustomerToUI = (dbData: DBCustomer): Customer => {
  // Dynamically calculate total_credit if transactions are included in the select
  let total_credit = 0;
  if (dbData.customer_transactions) {
    total_credit = dbData.customer_transactions.reduce((sum, tx) => {
      const amount = Number(tx.amount);
      return tx.type === 'Credit' ? sum + amount : sum - amount;
    }, 0);
  }

  // Cast to UI Customer which includes total_credit for the service
  return {
    id: dbData.id,
    name: dbData.name,
    phone: dbData.phone || undefined,
    address: dbData.address || undefined,
    is_active: dbData.is_active,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at,
    total_credit: Math.max(0, total_credit), // UI never displays negative credit safely
  } as Customer;
};

// Map customer UI data to DB row
const mapCustomerToDB = (uiData: Partial<Customer>): Partial<DBCustomer> => {
  const dbData: Partial<DBCustomer> = {};
  if (uiData.name !== undefined) dbData.name = uiData.name;
  if (uiData.phone !== undefined) dbData.phone = uiData.phone || null;
  if (uiData.address !== undefined) dbData.address = uiData.address || null;
  return dbData;
};

// Map transaction DB row to UI interface
const mapTransactionToUI = (dbData: DBCustomerTransaction): CustomerTransaction => ({
  id: dbData.id,
  customer_id: dbData.customer_id,
  type: mapTransactionTypeToUI(dbData.type),
  payment_method: mapPaymentMethodToUI(dbData.payment_method),
  amount: Number(dbData.amount),
  reference: dbData.reference_id || undefined,
  notes: dbData.notes || undefined,
  business_date: dbData.business_date,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});



export const customerRepository = {
  getCustomers: async (): Promise<RepoResult<Customer[]>> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_transactions(amount, type)`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapCustomerToUI(row as unknown as DBCustomer)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getCustomer: async (id: string): Promise<RepoResult<Customer | null>> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_transactions(amount, type)`)
        .eq('id', id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();
        
      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapCustomerToUI(data as unknown as DBCustomer) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  searchCustomers: async (query: string): Promise<RepoResult<Customer[]>> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_transactions(amount, type)`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .ilike('name', `%${query}%`)
        .order('name');
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapCustomerToUI(row as unknown as DBCustomer)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createCustomer: async (customerData: Partial<Customer>): Promise<RepoResult<Customer>> => {
    try {
      const dbPayload = mapCustomerToDB(customerData);
      const { data, error } = await supabase
        .from('customers')
        .insert([dbPayload])
        .select(`*, customer_transactions(amount, type)`)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapCustomerToUI(data as unknown as DBCustomer) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateCustomer: async (id: string, updates: Partial<Customer>): Promise<RepoResult<Customer>> => {
    try {
      const dbPayload = mapCustomerToDB(updates);
      
      const { data, error } = await supabase
        .from('customers')
        .update(dbPayload)
        .eq('id', id)
        .select(`*, customer_transactions(amount, type)`)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapCustomerToUI(data as unknown as DBCustomer) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteCustomer: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('customers')
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

  getCustomerTransactions: async (customerId: string): Promise<RepoResult<CustomerTransaction[]>> => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapTransactionToUI(row as DBCustomerTransaction)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getAllCustomerTransactions: async (dateStr?: string): Promise<RepoResult<CustomerTransaction[]>> => {
    try {
      let query = supabase
        .from('customer_transactions')
        .select('id, customer_id, business_date, amount, type, payment_method, reference_id, reference_type, notes, created_at, updated_at');
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query
        .order('business_date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapTransactionToUI(row as DBCustomerTransaction)) };
    } catch (e) {
      return handleDbError(e);
    }
  },
  addTransaction: async (
    customerId: string, 
    amount: number, 
    business_date: string, 
    type: 'credit' | 'payment',
    payment_method?: 'Cash' | 'UPI' | 'Bank',
    reference?: string, 
    notes?: string,
    reference_type?: string
  ): Promise<RepoResult<CustomerTransaction>> => {
    try {
      const dbPayload: Partial<DBCustomerTransaction> = {
        customer_id: customerId,
        amount: amount,
        business_date: business_date,
        type: mapTransactionTypeToDB(type),
        payment_method: mapPaymentMethodToDB(payment_method),
        reference_id: reference && reference.trim() !== '' ? reference : null,
        reference_type: reference_type && reference_type.trim() !== '' ? reference_type : null,
        notes: notes && notes.trim() !== '' ? notes : null
      };

      if (type === 'payment') {
        const { data, error } = await supabase
          .rpc('record_customer_payment', { payload: dbPayload });
          
        if (error) return handleDbError(error);
        return { success: true, data: mapTransactionToUI(data as DBCustomerTransaction) };
      } else {
        const { data, error } = await supabase
          .from('customer_transactions')
          .insert([dbPayload])
          .select()
          .single();
          
        if (error) return handleDbError(error);
        return { success: true, data: mapTransactionToUI(data as DBCustomerTransaction) };
      }
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateTransaction: async (
    transactionId: string,
    updates: { amount?: number; notes?: string; payment_method?: 'Cash' | 'UPI' | 'Bank' }
  ): Promise<RepoResult<CustomerTransaction>> => {
    try {
      const dbPayload: Partial<DBCustomerTransaction> = {};
      if (updates.amount !== undefined) dbPayload.amount = updates.amount;
      if (updates.notes !== undefined) dbPayload.notes = updates.notes;
      if (updates.payment_method !== undefined) dbPayload.payment_method = mapPaymentMethodToDB(updates.payment_method);
      
      const { data, error } = await supabase
        .from('customer_transactions')
        .update(dbPayload)
        .eq('id', transactionId)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapTransactionToUI(data as DBCustomerTransaction) };
    } catch (e) {
      return handleDbError(e);
    }
  },
  
  deleteTransaction: async (transactionId: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .from('customer_transactions')
        .delete()
        .eq('id', transactionId);
        
      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  },
  
  getDailyCreditTotals: async (): Promise<RepoResult<Record<string, number>>> => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('business_date, amount')
        .eq('type', 'Credit');
        
      if (error) return handleDbError(error);
      
      const totals: Record<string, number> = {};
      (data || []).forEach(row => {
        const date = row.business_date;
        totals[date] = (totals[date] || 0) + Number(row.amount);
      });
      return { success: true, data: totals };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
