import { supabase } from '../lib/supabase';
import { DailyClosing } from '../types/closing';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';

export interface DBDailyClosing {
  id: string;
  business_date: string;
  opening_cash: number;
  opening_upi: number;
  expected_cash: number;
  actual_cash: number;
  expected_upi: number;
  actual_upi: number;
  difference: number;
  estimated_stock_value: number;
  status: 'Open' | 'Closed' | 'Unlocked';
  closing_notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBDailyClosing): Partial<DailyClosing> => ({
  date: dbData.business_date,
  expectedCash: Number(dbData.expected_cash),
  actualCash: Number(dbData.actual_cash),
  difference: Number(dbData.difference),
  estimatedStockValue: Number(dbData.estimated_stock_value || 0),
  status: dbData.status,
  closingNotes: dbData.closing_notes || '',
  closedAt: dbData.closed_at || '',
  createdAt: dbData.created_at,
  lastUpdatedAt: dbData.updated_at
});

const mapToDB = (uiData: Partial<DailyClosing>): Partial<DBDailyClosing> => {
  const dbData: Partial<DBDailyClosing> = {};
  if (uiData.date !== undefined) dbData.business_date = uiData.date;
  if (uiData.expectedCash !== undefined) dbData.expected_cash = uiData.expectedCash;
  if (uiData.actualCash !== undefined) dbData.actual_cash = uiData.actualCash;
  if (uiData.difference !== undefined) dbData.difference = uiData.difference;
  if (uiData.estimatedStockValue !== undefined) dbData.estimated_stock_value = uiData.estimatedStockValue;
  if (uiData.status !== undefined) dbData.status = uiData.status;
  if (uiData.closingNotes !== undefined) dbData.closing_notes = uiData.closingNotes || null;
  if (uiData.closedAt !== undefined) dbData.closed_at = uiData.closedAt || null;
  return dbData;
};

export const closingRepository = {
  getDailyClosings: async (): Promise<RepoResult<Partial<DailyClosing>[]>> => {
    try {
      const { data, error } = await supabase
        .from('daily_closings')
        .select('*')
        .order('business_date', { ascending: false });

      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBDailyClosing)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getDailyClosing: async (businessDate: string): Promise<RepoResult<Partial<DailyClosing> | null>> => {
    try {
      const { data, error } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('business_date', businessDate)
        .maybeSingle();

      if (error) return handleDbError(error);
      if (!data) return { success: true, data: null };
      return { success: true, data: mapToUI(data as DBDailyClosing) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createDailyClosing: async (closing: Partial<DailyClosing>): Promise<RepoResult<Partial<DailyClosing>>> => {
    try {
      const dbPayload = mapToDB(closing);
      
      // Use upsert internally if requested by architecture efficiency rule, or insert.
      // The user explicitly stated: "If the existing implementation internally uses Supabase upsert for efficiency, that is acceptable, but the PUBLIC repository API must expose separate methods."
      const { data, error } = await supabase
        .from('daily_closings')
        .upsert(dbPayload, { onConflict: 'business_date' })
        .select()
        .single();

      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBDailyClosing) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateDailyClosing: async (businessDate: string, updates: Partial<DailyClosing>): Promise<RepoResult<Partial<DailyClosing>>> => {
    try {
      const dbPayload = mapToDB(updates);
      
      const { data, error } = await supabase
        .from('daily_closings')
        .update(dbPayload)
        .eq('business_date', businessDate)
        .select()
        .single();

      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBDailyClosing) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  reopenDailyClosing: async (businessDate: string): Promise<RepoResult<Partial<DailyClosing>>> => {
    try {
      const { data, error } = await supabase
        .from('daily_closings')
        .update({ status: 'Unlocked', closed_at: null })
        .eq('business_date', businessDate)
        .select()
        .single();

      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBDailyClosing) };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
