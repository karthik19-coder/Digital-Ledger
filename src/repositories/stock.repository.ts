import { supabase } from '../lib/supabase';
import { StockPurchase } from '../types/stock';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { vendorRepository } from './vendor.repository';
import { validateAmount } from './shared/validators';

export interface DBPurchase {
  id: string;
  vendor_id: string;
  business_date: string;
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

const mapToUI = (dbData: DBPurchase): StockPurchase => {
  const cash = Number(dbData.cash_amount);
  const upi = Number(dbData.upi_amount);
  const credit = Number(dbData.credit_amount);
  const total = Number(dbData.total_amount);
  const paid = cash + upi;

  let payment_type: 'paid' | 'partial' | 'credit' = 'credit';
  if (paid >= total && total > 0) payment_type = 'paid';
  else if (paid > 0 && credit > 0) payment_type = 'partial';
  else if (paid === 0) payment_type = 'credit';

  return {
    id: dbData.id,
    vendor_id: dbData.vendor_id,
    invoice_number: dbData.reference_number || undefined,
    purchase_date: dbData.business_date,
    purchase_amount: total,
    payment_type,
    paid_amount: paid,
    payment_method: (dbData.payment_method as 'Cash' | 'UPI' | 'Bank') || undefined,
    notes: dbData.notes || undefined,
    created_at: dbData.created_at,
    // vendor_purchase_tx_id and vendor_payment_tx_id are deprecated but kept optional in UI
  };
};

const mapToDB = (uiData: Partial<StockPurchase>): Partial<DBPurchase> => {
  const dbData: Partial<DBPurchase> = {};

  if (uiData.vendor_id !== undefined) dbData.vendor_id = uiData.vendor_id;
  if (uiData.purchase_date !== undefined) dbData.business_date = uiData.purchase_date;
  if (uiData.invoice_number !== undefined) dbData.reference_number = uiData.invoice_number || null;
  if (uiData.notes !== undefined) dbData.notes = uiData.notes || null;

  if (uiData.purchase_amount !== undefined || uiData.paid_amount !== undefined || uiData.payment_type !== undefined || uiData.payment_method !== undefined) {
    const total = uiData.purchase_amount || 0;
    const paid = uiData.paid_amount || 0;
    const pType = uiData.payment_type || 'credit';
    const method = uiData.payment_method || null;

    dbData.total_amount = total;
    dbData.payment_method = method;

    if (pType === 'credit') {
      dbData.cash_amount = 0;
      dbData.upi_amount = 0;
      dbData.credit_amount = total;
    } else if (pType === 'paid') {
      dbData.credit_amount = 0;
      if (method === 'Cash') {
        dbData.cash_amount = total;
        dbData.upi_amount = 0;
      } else {
        dbData.cash_amount = 0;
        dbData.upi_amount = total;
      }
    } else if (pType === 'partial') {
      dbData.credit_amount = total - paid;
      if (method === 'Cash') {
        dbData.cash_amount = paid;
        dbData.upi_amount = 0;
      } else {
        dbData.cash_amount = 0;
        dbData.upi_amount = paid;
      }
    }
  }

  return dbData;
};

export const stockRepository = {
  getPurchases: async (): Promise<RepoResult<StockPurchase[]>> => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBPurchase)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getPurchase: async (id: string): Promise<RepoResult<StockPurchase | null>> => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapToUI(data as DBPurchase) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createPurchase: async (purchaseData: Partial<StockPurchase>): Promise<RepoResult<StockPurchase>> => {
    try {
      if (!purchaseData.vendor_id || !purchaseData.purchase_date) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor ID and Date are required' } };
      }

      validateAmount(purchaseData.purchase_amount || 0);

      const dbPayload = mapToDB(purchaseData);

      const { data, error } = await supabase
        .rpc('create_purchase', { payload: dbPayload });

      if (error) return handleDbError(error);
      const insertedPurchase = mapToUI(data as DBPurchase);

      return { success: true, data: insertedPurchase };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updatePurchase: async (id: string, updates: Partial<StockPurchase>): Promise<RepoResult<StockPurchase>> => {
    try {
      // Fetch the old purchase first to know its vendor_id in case it changed
      const oldRes = await stockRepository.getPurchase(id);
      if (!oldRes.success || !oldRes.data) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Purchase not found for update' } };

      const dbPayload = mapToDB(updates);
      const { data, error } = await supabase
        .rpc('update_purchase', { purchase_id: id, payload: dbPayload });

      if (error) return handleDbError(error);
      const updatedPurchase = mapToUI(data as DBPurchase);

      return { success: true, data: updatedPurchase };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deletePurchase: async (id: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase
        .rpc('delete_purchase', { purchase_id: id });

      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
