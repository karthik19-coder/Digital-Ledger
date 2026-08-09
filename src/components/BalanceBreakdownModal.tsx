import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Wallet, CreditCard, Loader2, ChevronRight,
  IndianRupee, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Users, Landmark, ReceiptText, Truck, BadgeIndianRupee,
  TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { businessDayService } from '../services/businessDay.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { format } from 'date-fns';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface BalanceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'cash' | 'upi';
}

interface BreakdownRow {
  label: string;
  value: number;
  icon: React.ReactNode;
  route: string;
  direction: 'in' | 'out' | 'neutral';
  isExpandable?: boolean;
  subItems?: { label: string; value: number }[];
}

export function BalanceBreakdownModal({ isOpen, onClose, type }: BalanceBreakdownModalProps) {
  const navigate = useNavigate();
  const { selectedDate } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(0);
  const [moneyInRows, setMoneyInRows] = useState<BreakdownRow[]>([]);
  const [moneyOutRows, setMoneyOutRows] = useState<BreakdownRow[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchBreakdown = async () => {
      try {
        if (type === 'cash') {
          const data = await businessDayService.getCashBreakdown(dateStr);
          setOpening(data.openingCash);
          setCurrentBalance(data.currentBalance);
          setMoneyInRows([
            { label: 'Cash Sales', value: data.moneyIn.cashSales, icon: <ShoppingCart className="w-4 h-4" />, route: '/sales', direction: 'in' },
            { label: 'Customer Collections', value: data.moneyIn.customerCollections, icon: <Users className="w-4 h-4" />, route: '/credit/customers', direction: 'in' },
            { label: 'Business Funds', value: data.moneyIn.businessFunds, icon: <Landmark className="w-4 h-4" />, route: '/business-funds', direction: 'in' },
          ]);
          setMoneyOutRows([
            { 
              label: 'Business Expenses', 
              value: data.moneyOut.expenses, 
              icon: <ReceiptText className="w-4 h-4" />, 
              route: '/expenses/history', 
              direction: 'out',
              isExpandable: true,
              subItems: Object.entries(data.moneyOut.expenseCategories || {}).map(([label, value]) => ({ label, value: value as number }))
            },
            { label: 'Vendor Payments', value: data.moneyOut.vendorPayments, icon: <Truck className="w-4 h-4" />, route: '/stock/vendors', direction: 'out' },
          ]);
        } else {
          const data = await businessDayService.getUpiBreakdown(dateStr);
          setOpening(data.openingUpi);
          setCurrentBalance(data.currentBalance);
          setMoneyInRows([
            { label: 'UPI Sales', value: data.moneyIn.upiSales, icon: <ShoppingCart className="w-4 h-4" />, route: '/sales', direction: 'in' },
            { label: 'Customer Collections', value: data.moneyIn.customerCollections, icon: <Users className="w-4 h-4" />, route: '/credit/customers', direction: 'in' },
            { label: 'Business Funds', value: data.moneyIn.businessFunds, icon: <Landmark className="w-4 h-4" />, route: '/business-funds', direction: 'in' },
          ]);
          setMoneyOutRows([
            { 
              label: 'Business Expenses', 
              value: data.moneyOut.expenses, 
              icon: <ReceiptText className="w-4 h-4" />, 
              route: '/expenses/history', 
              direction: 'out',
              isExpandable: true,
              subItems: Object.entries(data.moneyOut.expenseCategories || {}).map(([label, value]) => ({ label, value: value as number }))
            },
            { label: 'Vendor Payments', value: data.moneyOut.vendorPayments, icon: <Truck className="w-4 h-4" />, route: '/stock/vendors', direction: 'out' },
          ]);
        }
      } catch (err) {
        console.error('Error fetching balance breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();
  }, [isOpen, dateStr, type]);

  if (!isOpen) return null;

  const isCash = type === 'cash';
  const accentColor = isCash ? 'emerald' : 'blue';
  const title = isCash ? 'Cash Balance' : 'UPI Balance';
  const subtitle = `See how the current ${isCash ? 'cash' : 'UPI'} balance is calculated.`;
  const HeaderIcon = isCash ? Wallet : CreditCard;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const moneyInTotal = moneyInRows.reduce((sum, r) => sum + r.value, 0);
  const moneyOutTotal = moneyOutRows.reduce((sum, r) => sum + r.value, 0);

  const handleRowTap = (route: string) => {
    onClose();
    navigate(route);
  };

  const toggleExpand = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-5 sm:px-6 flex items-center justify-between relative overflow-hidden shrink-0 bg-gradient-to-r from-[#0F172A] via-[#123A5C] to-[#0F766E]">
          <div className="absolute right-0 top-0 w-32 h-32 opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none">
            <HeaderIcon className="w-32 h-32 text-white" />
          </div>
          {/* Soft background pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <HeaderIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight tracking-tight">{title}</h2>
              <p className="text-white/80 text-xs sm:text-sm font-medium mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10 rounded-full transition-colors relative z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-slate-400" />
              <p className="text-sm font-medium">Calculating breakdown…</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Current Balance Hero */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#EEF2F7] text-center flex flex-col items-center justify-center">
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Current {isCash ? 'Cash' : 'UPI'} Balance
                </p>
                <h3 className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(currentBalance)}
                </h3>
              </div>

              {/* Opening Balance */}
              <div className="bg-white rounded-[24px] px-5 py-4 shadow-sm border border-[#EEF2F7] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Opening {isCash ? 'Cash' : 'UPI'}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-900">{formatCurrency(opening)}</span>
              </div>

              {/* Money In Section */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#EEF2F7] overflow-hidden">
                <div className="px-5 py-3.5 bg-emerald-50/50 flex items-center justify-between border-b border-[#EEF2F7]">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Money In</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(moneyInTotal)}</span>
                </div>
                <div className="divide-y divide-[#EEF2F7]">
                  {moneyInRows.map((row) => (
                    <button
                      key={row.label}
                      onClick={() => handleRowTap(row.route)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                          {row.icon}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{row.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${row.value > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {row.value > 0 ? '+' : ''}{formatCurrency(row.value)}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Money Out Section */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#EEF2F7] overflow-hidden">
                <div className="px-5 py-3.5 bg-red-50/50 flex items-center justify-between border-b border-[#EEF2F7]">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Money Out</span>
                  </div>
                  <span className="text-sm font-extrabold text-red-700">{formatCurrency(moneyOutTotal)}</span>
                </div>
                <div className="divide-y divide-[#EEF2F7]">
                  {moneyOutRows.map((row) => {
                    const isExpanded = expandedRows[row.label];
                    const isVendor = row.label === 'Vendor Payments';
                    const iconBg = isVendor ? 'bg-orange-50' : 'bg-red-50';
                    const iconColor = isVendor ? 'text-orange-600' : 'text-red-600';
                    const hoverIconBg = isVendor ? 'group-hover:bg-orange-100' : 'group-hover:bg-red-100';

                    return (
                      <div key={row.label} className="flex flex-col">
                        <button
                          onClick={(e) => {
                            if (row.isExpandable) {
                              toggleExpand(row.label, e);
                            } else {
                              handleRowTap(row.route);
                            }
                          }}
                          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center ${iconColor} ${hoverIconBg} transition-colors`}>
                              {row.icon}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${row.value > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {row.value > 0 ? '-' : ''}{formatCurrency(row.value)}
                            </span>
                            {row.isExpandable ? (
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </button>
                        
                        {row.isExpandable && isExpanded && row.subItems && row.subItems.length > 0 && (
                          <div className="bg-slate-50 border-t border-b border-[#EEF2F7] divide-y divide-[#EEF2F7]">
                            {row.subItems.map((sub, idx) => (
                              <div key={idx} className="px-5 py-3 flex items-center justify-between pl-16">
                                <span className="text-xs font-semibold text-slate-500">{sub.label}</span>
                                <span className="text-xs font-bold text-slate-700">{formatCurrency(sub.value)}</span>
                              </div>
                            ))}
                            <div className="px-5 py-2.5 flex justify-end">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRowTap(row.route); }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest transition-colors flex items-center gap-1"
                              >
                                View History <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Final Balance Footer */}
        {!loading && (
          <div className="px-6 py-5 bg-gradient-to-r from-[#0F172A] via-[#123A5C] to-[#0F766E] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center">
                <HeaderIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Current {isCash ? 'Cash' : 'UPI'} Balance
              </span>
            </div>
            <span className={`text-xl font-extrabold ${currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
