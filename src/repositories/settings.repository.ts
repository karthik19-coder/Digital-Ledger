import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { supabase } from '../lib/supabase';
import { Settings } from '../types/settings';
import { SettingsAuditLog } from '../types/audit';

interface DBSettings {
  id: string;
  store_name: string;
  owner_name: string;
  currency: string;
  opening_balance_cash: number;
  opening_balance_upi: number;
  opening_inventory_value: number;
  opening_customer_due: number;
  opening_vendor_due: number;
  average_profit_margin: number;
  business_start_date: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBSettings): Settings => ({
  id: 1, // UI expects number, DB uses UUID. Hardcoded to satisfy UI single-store constraint.
  shop_name: dbData.store_name,
  owner_name: dbData.owner_name,
  password_hash: '', // Removed from persistence. Replaced by Supabase Auth (or removed entirely in future).
  currency: dbData.currency,
  timezone: dbData.timezone,
  opening_cash: dbData.opening_balance_cash,
  opening_upi: dbData.opening_balance_upi,
  opening_stock: dbData.opening_inventory_value,
  opening_customer_due: dbData.opening_customer_due,
  opening_vendor_due: dbData.opening_vendor_due,
  average_profit_margin: dbData.average_profit_margin,
  business_start_date: dbData.business_start_date,
  is_setup_complete: true, // If we have a DB record, setup is complete
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});

const mapToDB = (uiData: Partial<Settings>): Partial<DBSettings> => {
  const dbData: Partial<DBSettings> = {};
  if (uiData.shop_name !== undefined) dbData.store_name = uiData.shop_name;
  if (uiData.owner_name !== undefined) dbData.owner_name = uiData.owner_name;
  if (uiData.currency !== undefined) dbData.currency = uiData.currency;
  if (uiData.opening_cash !== undefined) dbData.opening_balance_cash = uiData.opening_cash;
  if (uiData.opening_upi !== undefined) dbData.opening_balance_upi = uiData.opening_upi;
  if (uiData.opening_stock !== undefined) dbData.opening_inventory_value = uiData.opening_stock;
  if (uiData.opening_customer_due !== undefined) dbData.opening_customer_due = uiData.opening_customer_due;
  if (uiData.opening_vendor_due !== undefined) dbData.opening_vendor_due = uiData.opening_vendor_due;
  if (uiData.average_profit_margin !== undefined) dbData.average_profit_margin = uiData.average_profit_margin;
  if (uiData.business_start_date !== undefined) dbData.business_start_date = uiData.business_start_date;
  if (uiData.timezone !== undefined) dbData.timezone = uiData.timezone;
  
  return dbData;
};

export const settingsRepository = {
  getSettings: async (): Promise<RepoResult<Settings>> => {
    const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (error) return handleDbError(error);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
    return { success: true, data: mapToUI(data as DBSettings) };
  },

  createSettings: async (settings: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<RepoResult<Settings>> => {
    // The database is seeded with a default settings row during migration.
    // RLS intentionally blocks INSERT on settings, so we must UPDATE the existing seeded row.
    return settingsRepository.updateSettings(settings as Partial<Settings>);
  },

  updateSettings: async (settings: Partial<Settings>): Promise<RepoResult<Settings>> => {
    const dbPayload = mapToDB(settings);
    
    const current = await supabase.from('settings').select('id').limit(1).maybeSingle();
    if (current.error) return handleDbError(current.error);
    if (!current.data) return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
    
    // Ensure we don't send an empty payload if only non-DB fields were updated
    if (Object.keys(dbPayload).length === 0) {
      const { data, error } = await supabase.from('settings').select('*').eq('id', current.data.id).maybeSingle();
      if (error) return handleDbError(error);
      if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
      return { success: true, data: mapToUI(data as DBSettings) };
    }
    
    const { data, error } = await supabase
      .from('settings')
      .update(dbPayload)
      .eq('id', current.data.id)
      .select()
      .maybeSingle();
      
    if (error) return handleDbError(error);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
    return { success: true, data: mapToUI(data as DBSettings) };
  },

  logAudit: async (logs: SettingsAuditLog[]): Promise<void> => {
    if (logs.length === 0) return;
    
    const current = await supabase.from('settings').select('id').limit(1).maybeSingle();
    if (current.error || !current.data) return;
    const recordId = current.data.id;

    const auditPayload = logs.map(log => ({
      table_name: 'settings',
      record_id: recordId,
      action: 'UPDATE',
      old_data: { [log.field_changed]: log.old_value, reason: log.reason },
      new_data: { [log.field_changed]: log.new_value },
    }));
    
    const { error } = await supabase.from('audit_logs').insert(auditPayload);
    if (error) console.error('Failed to insert audit log:', error);
  },

  getAuditLogs: async (): Promise<SettingsAuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'settings')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
    
    return data.map(row => {
      // Reconstruct UI log from DB format
      const fieldChanged = Object.keys(row.new_data || {})[0] || 'unknown';
      const reason = row.old_data?.reason;
      return {
        id: row.id,
        field_changed: fieldChanged,
        old_value: row.old_data?.[fieldChanged] ?? '',
        new_value: row.new_data?.[fieldChanged] ?? '',
        changed_at: row.created_at,
        changed_by: row.created_by || 'System',
        reason
      };
    });
  },
  
  verifyPassword: async (_password: string): Promise<boolean> => {
    // Password hash was removed completely from persistence.
    // Return true for now until Supabase Auth replaces local passwords.
    return true;
  }
};
