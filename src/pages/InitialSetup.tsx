import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowRight, DollarSign, Wallet, Users, ShoppingBag, Package, Percent, Loader2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { settingsService } from '../services/settings.service';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

export function InitialSetup() {
  const navigate = useNavigate();
  const { isOwner, requirePermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    opening_cash: '0',
    opening_upi: '0',
    opening_customer_due: '0',
    opening_vendor_due: '0',
    opening_stock: '0',
    average_profit_margin: '15',
    business_start_date: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'business_start_date') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    if (value === '' || /^\d+$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // First fetch the existing settings row to ensure we don't overwrite master data
      const existingSettings = await settingsService.getSettings();
      
      // Update only the fields the user actually entered during setup
      await settingsService.updateSettings({
        opening_cash: parseInt(formData.opening_cash) || 0,
        opening_upi: parseInt(formData.opening_upi) || 0,
        opening_customer_due: parseInt(formData.opening_customer_due) || 0,
        opening_vendor_due: parseInt(formData.opening_vendor_due) || 0,
        opening_stock: parseInt(formData.opening_stock) || 0,
        average_profit_margin: parseInt(formData.average_profit_margin) || 15,
        business_start_date: formData.business_start_date,
        is_setup_complete: true // Mark setup as complete
      }, 'Initial Setup');
      
      // Dispatch an event so AppLayout knows settings have changed
      window.dispatchEvent(new Event('app-data-refresh'));
      
      navigate('/');
    } catch (error) {
      console.error('Setup failed', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Supermarket Ledger</h1>
          <p className="text-slate-600">Let's set up your starting balances. You only need to do this once.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg border-slate-200 overflow-hidden mb-6">
            <CardContent className="p-0">
              <div className="bg-blue-600 text-white p-6">
                <h2 className="text-lg font-bold">Opening Financial State</h2>
                <p className="text-blue-100 text-sm mt-1">
                  These balances will be carried forward automatically every business day.
                </p>
              </div>
              
              <div className="p-6 grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Opening Cash Balance
                  </label>
                  <Input
                    name="opening_cash"
                    type="text"
                    inputMode="numeric"
                    value={formData.opening_cash}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    Opening UPI / Bank
                  </label>
                  <Input
                    name="opening_upi"
                    type="text"
                    inputMode="numeric"
                    value={formData.opening_upi}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Opening Customer Due
                  </label>
                  <Input
                    name="opening_customer_due"
                    type="text"
                    inputMode="numeric"
                    value={formData.opening_customer_due}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-rose-500" />
                    Opening Vendor Due
                  </label>
                  <Input
                    name="opening_vendor_due"
                    type="text"
                    inputMode="numeric"
                    value={formData.opening_vendor_due}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    Opening Inventory Value
                  </label>
                  <Input
                    name="opening_stock"
                    type="text"
                    inputMode="numeric"
                    value={formData.opening_stock}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-500" />
                    Average Profit Margin (%)
                  </label>
                  <Input
                    name="average_profit_margin"
                    type="text"
                    inputMode="numeric"
                    value={formData.average_profit_margin}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Business Start Date
                  </label>
                  <Input
                    name="business_start_date"
                    type="date"
                    value={formData.business_start_date}
                    onChange={handleChange}
                    className="text-lg"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <button
            type="submit"
            onClick={(e) => { if (!requirePermission(e)) e.preventDefault(); }}
            disabled={isSubmitting}
            className={cn("w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-70", !isOwner() && "opacity-50 cursor-not-allowed")}
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Complete Setup
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
