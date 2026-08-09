import { supabase } from '../lib/supabase';
import { SaleTransaction } from '../services/sales.service';

import { RepoResult } from './shared/repoResult';
export type { RepoResult };
import { handleDbError } from './shared/supabaseError';

export interface DBSale {
  id: string;
  business_date: string;
  customer_id: string | null;
  total_amount: number;
  cash_amount: number;
  upi_amount: number;
  credit_amount: number;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBSale): SaleTransaction => {
  return {
    id: dbData.id,
    sale_date: dbData.business_date,
    cash_sales: Number(dbData.cash_amount),
    upi_sales: Number(dbData.upi_amount),
    credit_sales: Number(dbData.credit_amount),
    customer_id: dbData.customer_id || undefined,
    reference_number: dbData.reference_number || undefined,
    notes: dbData.notes || undefined,
    created_at: dbData.created_at,
  };
};

export const salesRepository = {
  getSales: async (dateStr?: string): Promise<RepoResult<SaleTransaction[]>> => {
    try {
      let query = supabase
        .from('sales')
        .select('id, business_date, cash_amount, upi_amount, credit_amount, total_amount, customer_id, reference_number, notes, created_at, updated_at');
      if (dateStr) query = query.eq('business_date', dateStr);
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBSale)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getSale: async (id: string): Promise<RepoResult<SaleTransaction | null>> => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapToUI(data as DBSale) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createSale: async (saleData: Partial<SaleTransaction>): Promise<RepoResult<SaleTransaction>> => {
    try {
      const cash = saleData.cash_sales || 0;
      const upi = saleData.upi_sales || 0;
      const credit = saleData.credit_sales || 0;
      const total = cash + upi + credit;

      if (total < 0) {
        return { success: false, error: { code: 'INVALID_AMOUNT', message: 'Total amount cannot be negative' } };
      }

      const dbPayload = {
        business_date: saleData.sale_date,
        cash_amount: cash,
        upi_amount: upi,
        credit_amount: credit,
        total_amount: total,
        customer_id: saleData.customer_id || null,
        reference_number: saleData.reference_number || null,
        notes: saleData.notes || null,
      };

      const { data: sale, error: saleError } = await supabase
        .rpc('create_sale', { payload: dbPayload });
        
      if (saleError) return handleDbError(saleError);

      return { success: true, data: mapToUI(sale as DBSale) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateSale: async (id: string, updates: Partial<SaleTransaction>): Promise<RepoResult<SaleTransaction>> => {
    try {
      // First get existing sale
      const { data: existing, error: existError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();
        
      if (existError) return handleDbError(existError);

      const cash = updates.cash_sales !== undefined ? updates.cash_sales : Number(existing.cash_amount);
      const upi = updates.upi_sales !== undefined ? updates.upi_sales : Number(existing.upi_amount);
      const credit = updates.credit_sales !== undefined ? updates.credit_sales : Number(existing.credit_amount);
      const total = cash + upi + credit;
      const customer_id = updates.customer_id !== undefined ? (updates.customer_id || null) : existing.customer_id;

      const dbPayload: any = {
        cash_amount: cash,
        upi_amount: upi,
        credit_amount: credit,
        total_amount: total,
        customer_id: customer_id,
      };

      if (updates.sale_date !== undefined) dbPayload.business_date = updates.sale_date;
      if (updates.reference_number !== undefined) dbPayload.reference_number = updates.reference_number || null;
      if (updates.notes !== undefined) dbPayload.notes = updates.notes || null;

      const { data: sale, error: updateError } = await supabase
        .rpc('update_sale', { sale_id: id, payload: dbPayload });
        
      if (updateError) return handleDbError(updateError);

      return { success: true, data: mapToUI(sale as DBSale) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteSale: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error: saleError } = await supabase
        .rpc('delete_sale', { sale_id: id });
        
      if (saleError) return handleDbError(saleError);

      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
