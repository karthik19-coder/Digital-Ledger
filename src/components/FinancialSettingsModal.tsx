import { useState, useEffect } from 'react';
import { Landmark, ArrowRight, DollarSign, Wallet, Users, ShoppingBag, Package, Percent, Loader2, Save, FileText, History, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { settingsService } from '../services/settings.service';
import { SettingsAuditLog } from '../types/audit';
import { format } from 'date-fns';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface FinancialSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FinancialSettingsModal({ isOpen, onClose }: FinancialSettingsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SettingsAuditLog[]>([]);
  
  const [formData, setFormData] = useState({
    opening_cash: '',
    opening_upi: '',
    opening_customer_due: '',
    opening_vendor_due: '',
    opening_stock: '',
    average_profit_margin: '',
    business_start_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowConfirm(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedSettings, logs] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getAuditLogs()
      ]);
      
      const settings: any = fetchedSettings || {};

      const finalFormData = {
        opening_cash: String(settings?.opening_cash ?? 0),
        opening_upi: String(settings?.opening_upi ?? 0),
        opening_customer_due: String(settings?.opening_customer_due ?? 0),
        opening_vendor_due: String(settings?.opening_vendor_due ?? 0),
        opening_stock: String(settings?.opening_stock ?? 0),
        average_profit_margin: String(settings?.average_profit_margin ?? 15),
        business_start_date: settings?.business_start_date || new Date().toISOString().split('T')[0],
        reason: ''
      };

      setFormData(finalFormData);
      setAuditLogs((logs || []).sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()));
    } catch (error) {
      console.error('Failed to load financial settings:', error);
      // Fallback to defaults on error
      setFormData({
        opening_cash: '0',
        opening_upi: '0',
        opening_customer_due: '0',
        opening_vendor_due: '0',
        opening_stock: '0',
        average_profit_margin: '15',
        business_start_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'reason') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    if (name === 'business_start_date') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    if (value === '' || /^\d+$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleInitialSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    
    try {
      await settingsService.updateSettings({
        opening_cash: parseInt(formData.opening_cash) || 0,
        opening_upi: parseInt(formData.opening_upi) || 0,
        opening_customer_due: parseInt(formData.opening_customer_due) || 0,
        opening_vendor_due: parseInt(formData.opening_vendor_due) || 0,
        opening_stock: parseInt(formData.opening_stock) || 0,
        average_profit_margin: parseInt(formData.average_profit_margin) || 15,
        business_start_date: formData.business_start_date,
      }, formData.reason || 'Manual Update');
      
      // Global refresh
      window.dispatchEvent(new Event('app-data-refresh'));
      onClose();
    } catch (error) {
      console.error('Save failed', error);
      setIsSaving(false);
    }
  };

  const formatFieldName = (field: string) => {
    return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative ${colors.neutral.bg} rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Financial Settings</h2>
              <p className="text-blue-100 text-xs font-medium">Opening Balances & Config</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-blue-100 hover:text-white hover:bg-blue-500 p-2 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : showConfirm ? (
            <div className="py-8 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Recalculate Business Data?</h3>
                <p className={`${colors.neutral.text}`}>
                  Changing opening financial values will automatically recalculate business data from your Business Start Date onward.
                </p>
                <p className={`${colors.neutral.text} font-semibold mt-2`}>
                  Do you want to continue?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleConfirmSave} 
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Yes, Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirm(false)}
                  disabled={isSaving}
                  className="w-full h-12 text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <form id="financial-settings-form" onSubmit={handleInitialSave}>
                <Card className={`shadow-sm ${colors.neutral.border}`}>
                  <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">Opening Balances</h3>
                  </div>
                  <CardContent className="p-4 space-y-4 bg-white">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          Opening Cash
                        </label>
                        <Input name="opening_cash" type="text" inputMode="numeric" value={formData.opening_cash} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-500" />
                          Opening UPI
                        </label>
                        <Input name="opening_upi" type="text" inputMode="numeric" value={formData.opening_upi} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-500" />
                          Opening Customer Due
                        </label>
                        <Input name="opening_customer_due" type="text" inputMode="numeric" value={formData.opening_customer_due} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-rose-500" />
                          Opening Vendor Due
                        </label>
                        <Input name="opening_vendor_due" type="text" inputMode="numeric" value={formData.opening_vendor_due} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Package className={`w-4 h-4 ${moduleTheme.stock.textLight}`} />
                          Opening Inventory Value
                        </label>
                        <Input name="opening_stock" type="text" inputMode="numeric" value={formData.opening_stock} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Percent className="w-4 h-4 text-indigo-500" />
                          Avg Profit Margin (%)
                        </label>
                        <Input name="average_profit_margin" type="text" inputMode="numeric" value={formData.average_profit_margin} onChange={handleChange} required />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          Business Start Date
                        </label>
                        <Input name="business_start_date" type="date" value={formData.business_start_date} onChange={handleChange} required />
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          Reason for Change (Optional)
                        </label>
                        <Input 
                          name="reason" 
                          type="text" 
                          placeholder="E.g., Corrected initial stock counting error" 
                          value={formData.reason} 
                          onChange={handleChange} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </form>

              <div className="pt-4">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Audit Log
                </h3>
                
                <div className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <div className={`text-center py-8 bg-white rounded-xl border ${colors.neutral.border} shadow-sm`}>
                      <p className="text-slate-500 text-sm">No changes recorded yet.</p>
                    </div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className={`bg-white p-4 rounded-xl shadow-sm border ${colors.neutral.border}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-700 text-sm">{formatFieldName(log.field_changed)}</span>
                          <span className="text-xs font-medium text-slate-500">{format(new Date(log.changed_at), 'dd MMM yyyy, h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-rose-600 font-semibold line-through">
                            {log.field_changed === 'average_profit_margin' ? log.old_value + '%' : '₹' + log.old_value}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="text-emerald-600 font-semibold">
                            {log.field_changed === 'average_profit_margin' ? log.new_value + '%' : '₹' + log.new_value}
                          </span>
                        </div>
                        {log.reason && (
                          <p className={`text-xs text-slate-500 mt-2 ${colors.neutral.bg} p-2 rounded-lg border border-slate-100`}>
                            Reason: {log.reason}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Changed by {log.changed_by}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Footer Actions */}
        {!showConfirm && !isLoading && (
          <div className={`p-4 bg-white border-t ${colors.neutral.border} shrink-0 flex items-center justify-end gap-3`}>
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" form="financial-settings-form" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
