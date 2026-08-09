import { Settings } from '../types/settings';
import { SettingsAuditLog } from '../types/audit';
import { settingsRepository } from '../repositories/settings.repository';

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  shop_name: 'Supermarket Ledger',
  owner_name: 'Owner',
  password_hash: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  opening_cash: 0,
  opening_upi: 0,
  opening_stock: 0,
  opening_customer_due: 0,
  opening_vendor_due: 0,
  average_profit_margin: 15,
  business_start_date: new Date().toISOString().split('T')[0],
  is_setup_complete: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const settingsService = {
  getSettings: async (): Promise<Settings> => {
    try {
      const res = await settingsRepository.getSettings();
      if (!res.success || !res.data) {
        // If no record exists in Supabase, setup is not complete.
        // We return DEFAULT_SETTINGS (which has is_setup_complete: false)
        // without saving to DB, so the UI routes to the Setup wizard.
        return DEFAULT_SETTINGS;
      }
      return res.data;
    } catch (error) {
      console.error('Failed to get settings:', error);
      // Fallback to default if DB fails initially
      return DEFAULT_SETTINGS;
    }
  },

  getOpeningStockValue: async (): Promise<number> => {
    const settings = await settingsService.getSettings();
    return settings.opening_stock;
  },

  getAverageProfitMargin: async (): Promise<number> => {
    const settings = await settingsService.getSettings();
    return settings.average_profit_margin;
  },

  createSettings: async (settingsData: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<Settings> => {
    const res = await settingsRepository.createSettings(settingsData);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to create settings');
    const newSettings = res.data;
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
    return newSettings;
  },

  updateSettings: async (newSettings: Partial<Settings>, reason?: string, username: string = 'Owner'): Promise<Settings> => {
    const current = await settingsService.getSettings();
    const res = await settingsRepository.updateSettings(newSettings);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update settings');
    const updated = res.data;
    
    const logs: SettingsAuditLog[] = [];
    const fieldsToCheck: (keyof Settings)[] = [
      'opening_cash', 'opening_upi', 'opening_stock', 
      'opening_customer_due', 'opening_vendor_due', 'average_profit_margin', 'business_start_date'
    ];

    fieldsToCheck.forEach(field => {
      if (newSettings[field] !== undefined && newSettings[field] !== current[field]) {
        logs.push({
          id: Math.random().toString(36).substring(2, 9),
          field_changed: field,
          old_value: current[field] as string | number,
          new_value: newSettings[field] as string | number,
          changed_at: new Date().toISOString(),
          changed_by: username,
          reason
        });
      }
    });

    if (logs.length > 0) {
      await settingsRepository.logAudit(logs);
    }

    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
    return updated;
  },

  getAuditLogs: async (): Promise<SettingsAuditLog[]> => {
    return await settingsRepository.getAuditLogs();
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    return await settingsRepository.verifyPassword(password);
  }
};
