import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Truck, Loader2, ChevronRight,
  TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCcw
} from 'lucide-react';
import { businessDayService } from '../services/businessDay.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { format } from 'date-fns';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface VendorDueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VendorDueBreakdownModal({ isOpen, onClose }: VendorDueBreakdownModalProps) {
  const navigate = useNavigate();
  const { selectedDate } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const [loading, setLoading] = useState(true);
  const [openingOutstanding, setOpeningOutstanding] = useState(0);
  const [stockPurchases, setStockPurchases] = useState(0);
  const [vendorPayments, setVendorPayments] = useState(0);
  const [manualAdjustments, setManualAdjustments] = useState(0);
  const [currentOutstanding, setCurrentOutstanding] = useState(0);
  const [vendors, setVendors] = useState<{ id: string; name: string; balance: number }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchBreakdown = async () => {
      try {
        const data = await businessDayService.getVendorDueBreakdown(dateStr);
        setOpeningOutstanding(data.openingDue);
        setStockPurchases(data.stockPurchases);
        setVendorPayments(data.vendorPayments);
        setManualAdjustments(data.manualAdjustments);
        setCurrentOutstanding(data.currentDue);
        setVendors(data.vendorsWithBalance);
      } catch (err) {
        console.error('Error fetching vendor due breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();
  }, [isOpen, dateStr]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleVendorTap = (vendorId: string) => {
    onClose();
    navigate(`/stock/vendors/${vendorId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between relative overflow-hidden shrink-0 ${moduleTheme.vendorCredit.bgGradient}`}>
          <div className="absolute right-0 top-0 w-32 h-32 opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none">
            <Truck className="w-32 h-32 text-white" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <Truck className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Vendor Due</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">See how the outstanding balance is calculated.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-slate-400" />
              <p className="text-sm font-medium">Calculating breakdown…</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 pb-6">
              {/* Current Due Hero */}
              <div className="px-5 py-5 sm:px-6 bg-gradient-to-b from-slate-50 to-white text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Vendor Due
                </p>
                <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight ${currentOutstanding >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatCurrency(currentOutstanding)}
                </h3>
              </div>

              {/* Breakdown List */}
              <div>
                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Opening Outstanding</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(openingOutstanding)}</span>
                </div>
                
                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Stock Purchases</span>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">+{formatCurrency(stockPurchases)}</span>
                </div>

                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Vendor Payments</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">-{formatCurrency(vendorPayments)}</span>
                </div>

                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                      <RefreshCcw className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Manual Adjustments (Future)</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{manualAdjustments > 0 ? '+' : ''}{formatCurrency(manualAdjustments)}</span>
                </div>
              </div>

              {/* Final Balance */}
              <div className={`px-5 py-4 sm:px-6 flex items-center justify-between ${moduleTheme.vendorCredit.bgGradient}`}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-rose-500/20 rounded-lg">
                    <Truck className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Current Vendor Due
                  </span>
                </div>
                <span className={`text-lg font-bold ${currentOutstanding >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  {formatCurrency(currentOutstanding)}
                </span>
              </div>

              {/* Vendors with Balance */}
              {vendors.length > 0 && (
                <div className="pt-6">
                  <div className="px-5 sm:px-6 mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Vendors with Outstanding Balance</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {vendors.map((vendor) => (
                      <button
                        key={vendor.id}
                        onClick={() => handleVendorTap(vendor.id)}
                        className={`w-full px-5 py-3 sm:px-6 flex items-center justify-between hover:${colors.neutral.bg} transition-colors group text-left`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center ${colors.neutral.text} font-semibold text-xs group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors`}>
                            {vendor.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-rose-700 transition-colors">{vendor.name}</p>
                            <p className="text-xs text-slate-500 group-hover:text-rose-600/70">View Ledger</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(vendor.balance)}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
