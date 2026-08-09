import { useState, useEffect } from 'react';

import {
  X, Package, Loader2,
  TrendingUp, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { stockService } from '../services/stock.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { format } from 'date-fns';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface StockValueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StockValueBreakdownModal({ isOpen, onClose }: StockValueBreakdownModalProps) {
  const { selectedDate } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const [loading, setLoading] = useState(true);
  const [openingStockValue, setOpeningStockValue] = useState(0);
  const [todayPurchases, setTodayPurchases] = useState(0);
  const [estimatedCogs, setEstimatedCogs] = useState(0);
  const [currentStockValue, setCurrentStockValue] = useState(0);
  const [averageProfitMargin, setAverageProfitMargin] = useState(0);
  const [todaySales, setTodaySales] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchBreakdown = async () => {
      try {
        const data = await stockService.getStockValueBreakdown(dateStr);
        setOpeningStockValue(data.openingStockValue);
        setTodayPurchases(data.todayPurchases);
        setEstimatedCogs(data.estimatedCogs);
        setCurrentStockValue(data.currentStockValue);
        setAverageProfitMargin(data.averageProfitMargin);
        setTodaySales(data.todaySales);
      } catch (err) {
        console.error('Error fetching stock value breakdown:', err);
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

  // Removed handleProductTap since there's no product list anymore

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between relative overflow-hidden shrink-0 ${moduleTheme.stock.bgGradient}`}>
          <div className="absolute right-0 top-0 w-32 h-32 opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none">
            <Package className="w-32 h-32 text-white" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Package className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Estimated Stock Value</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">See how your current inventory value is calculated.</p>
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
              {/* Current Value Hero */}
              <div className="px-5 py-5 sm:px-6 bg-gradient-to-b from-slate-50 to-white text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Stock Value
                </p>
                <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight text-slate-900`}>
                  {formatCurrency(currentStockValue)}
                </h3>
              </div>

              {/* Breakdown List */}
              <div>
                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Opening Stock Value</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(openingStockValue)}</span>
                </div>
                
                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Today's Purchases</span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">+{formatCurrency(todayPurchases)}</span>
                </div>

                <div className={`px-5 py-3.5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Estimated COGS</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">-{formatCurrency(estimatedCogs)}</span>
                </div>
              </div>

              {/* Final Estimated Value */}
              <div className={`px-5 py-4 sm:px-6 flex items-center justify-between ${moduleTheme.stock.bgGradient}`}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                    <Package className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Current Stock Value
                  </span>
                </div>
                <span className={`text-lg font-bold text-white`}>
                  {formatCurrency(currentStockValue)}
                </span>
              </div>

              {/* Formula & Reference */}
              <div className="pt-6 px-5 sm:px-6">
                <div className={`${colors.neutral.bg} rounded-xl border border-slate-100 p-4 mb-4`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated COGS Formula</p>
                  <p className={`text-sm text-slate-700 font-mono bg-white p-2 rounded border ${colors.neutral.border}`}>
                    COGS = Today's Sales ÷ (1 + Avg Profit %)
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    * Future-ready: COGS will automatically use actual per-product margins when SKU tracking is fully enabled.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Average Profit Margin</span>
                    <span className="text-sm font-bold text-slate-900">{averageProfitMargin}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Today's Sales</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(todaySales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Estimated Stock Sold (Cost)</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(estimatedCogs)}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
