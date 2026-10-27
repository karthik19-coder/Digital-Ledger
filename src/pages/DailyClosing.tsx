import { useState, useEffect } from 'react';

import { format, parseISO } from 'date-fns';
import { closingService } from '../services/closing.service';
import { businessDateService } from '../services/businessDate.service';
import { DailyClosing } from '../types/closing';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { AppHeaderBanner, BusinessDateNavigator, HeaderSummaryCard, ExportButton } from '../components/shared';
import { dailyClosingExportProvider } from '../services/export/providers/dailyClosingExportProvider';
import { 
  ArrowLeft,
  Moon, 
  IndianRupee, 
  Wallet,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ReceiptText,
  Users,
  Truck,
  Package,
  Landmark
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { useSmartBack } from '../hooks/useSmartBack';
import { useFormBlocker } from '../hooks/useFormBlocker';
import { cn } from '../lib/utils';


export default function DailyClosingPage() {
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  const { selectedDate, setSelectedDate, nextDay, previousDay, isToday: isBusinessDateToday } = useBusinessDate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [existingClosing, setExistingClosing] = useState<DailyClosing | null>(null);
  
  const [actualCash, setActualCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState('');

  const isDirty = (actualCash !== '' && actualCash !== existingClosing?.actualCash?.toString()) || (closingNotes !== (existingClosing?.closingNotes || ''));
  useFormBlocker(isDirty && !saving);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const calcData = await closingService.getCalculatedDataForDate(dateStr);
        const closing = await closingService.getClosingForDate(dateStr);
        
        if (closing) {
          if (closing.status === 'Closed') {
            if (closing.expectedCash !== undefined) calcData.expectedCash = closing.expectedCash;
            if (closing.estimatedStockValue !== undefined && closing.estimatedStockValue !== 0) calcData.estimatedStockValue = closing.estimatedStockValue;
          }
          setExistingClosing(closing as DailyClosing);
          setActualCash(closing.actualCash?.toString() || '');
          setClosingNotes(closing.closingNotes || '');
        }
        setData(calcData);
      } catch (err) {
        console.error('Failed to load daily closing data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    const handleRefresh = () => fetchData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('financial-data-updated', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('financial-data-updated', handleRefresh);
    };
  }, [selectedDate]);


  const expectedCash = data?.expectedCash || 0;
  const numActualCash = actualCash ? parseFloat(actualCash) : 0;
  const difference = numActualCash - expectedCash;

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const payload: DailyClosing = {
        date: dateStr,
        sales: data.sales,
        expenses: data.expenses,
        customerCollections: data.customerCollections,
        vendorPayments: data.vendorPayments,
        businessFunds: data.businessFunds,
        estimatedStockValue: data.estimatedStockValue,
        customerDue: data.customerDue,
        vendorDue: data.vendorDue,
        expectedCash,
        actualCash: numActualCash,
        difference,
        closingNotes,
        status: 'Closed',
        closedAt: existingClosing?.closedAt || new Date().toISOString(),
      };
      
      await closingService.saveClosing(payload);
      businessDateService.setSelectedBusinessDate(new Date());
      window.dispatchEvent(new Event('app-data-refresh'));
      smartBack('/');
    } catch (err) {
      console.error(err);
      alert('Failed to save closing snapshot.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col min-h-screen ${colors.neutral.bg} p-6 animate-pulse`}>
        <div className="h-10 bg-slate-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-slate-200 rounded-2xl mb-4"></div>
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  const isResubmitting = !!existingClosing;

  return (
    <div className={`flex flex-col min-h-screen ${colors.neutral.bg}`}>
      <AppHeaderBanner
        theme="dailyClosing"
        title="Daily Closing"
        icon={Moon}
        onBack={() => smartBack('/')}
        rightAction={
          <BusinessDateNavigator 
            selectedDate={selectedDate}
            onPrevious={previousDay}
            onNext={nextDay}
            onDateChange={setSelectedDate}
            disableNext={isBusinessDateToday}
            showTodayBadge={true}
          />
        }
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="EXPECTED CASH" 
            amount={expectedCash} 
          />
          {data && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => dailyClosingExportProvider.getExportData(data, actualCash)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
      </AppHeaderBanner>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 pb-24 safe-page-pb max-w-2xl lg:max-w-4xl mx-auto w-full mt-6">
        {existingClosing && (
          <div className={`bg-white rounded-xl shadow-sm p-4 border ${colors.neutral.border} text-sm ${colors.neutral.text} flex flex-col gap-1`}>
            <p><strong>Opened:</strong> {existingClosing.createdAt ? format(parseISO(existingClosing.createdAt), 'PPpp') : 'N/A'}</p>
            <p><strong>Closed:</strong> {existingClosing.closedAt ? format(parseISO(existingClosing.closedAt), 'PPpp') : 'N/A'}</p>
            {existingClosing.lastUpdatedAt && existingClosing.lastUpdatedAt !== existingClosing.closedAt && (
              <p><strong>Last Updated:</strong> {format(parseISO(existingClosing.lastUpdatedAt), 'PPpp')}</p>
            )}
          </div>
        )}

        {/* Business Summary */}
        <section>
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 px-1">Business Summary</h2>
          <Card className={`shadow-sm ${colors.neutral.border} overflow-hidden rounded-2xl`}>
            <div className="divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Wallet className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Cash Sales</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.sales.cash)}</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <IndianRupee className={`w-4 h-4 ${moduleTheme.dailyClosing.textLight}`} />
                  <span className="text-sm font-medium">UPI Sales</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.sales.upi)}</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Users className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Credit Sales</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.sales.credit)}</span>
              </div>
              <div className="p-4 flex flex-col justify-center bg-white">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                    <ReceiptText className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Expenses & Withdrawals</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.expenses.total + data.expenses.personalWithdrawals)}</span>
                </div>
                <div className="pl-7 pt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Business Cash</span>
                    <span className="text-xs font-medium text-slate-700">{formatCurrency(data.expenses.cash)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Business UPI</span>
                    <span className="text-xs font-medium text-slate-700">{formatCurrency(data.expenses.upi)}</span>
                  </div>
                  {(data.expenses.personalWithdrawals > 0) && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Personal Withdrawals</span>
                      <span className="text-xs font-medium text-slate-700">{formatCurrency(data.expenses.personalWithdrawals)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Business Funds Added</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.businessFunds?.total || 0)}</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Customer Collections</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.customerCollections.total)}</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Truck className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">Vendor Payments</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.vendorPayments.total)}</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Package className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Estimated Stock Value</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.estimatedStockValue)}</span>
              </div>
              <div className={`p-4 flex items-center justify-between ${colors.neutral.bg}`}>
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Users className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Customer Due</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.customerDue)}</span>
              </div>
              <div className={`p-4 flex items-center justify-between ${colors.neutral.bg}`}>
                <div className={`flex items-center gap-3 ${colors.neutral.text}`}>
                  <Truck className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">Vendor Due</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.vendorDue)}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Cash Reconciliation */}
        <section>
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 px-1">Cash Reconciliation</h2>
          <Card className={`shadow-sm ${colors.neutral.border} overflow-hidden rounded-2xl bg-white`}>
            <CardContent className="p-0">
              <div className={`p-5 ${moduleTheme.dailyClosing.bgGradient} text-white flex justify-between items-center`}>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Expected Cash</p>
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <h3 className="text-2xl font-bold">{formatCurrency(expectedCash)}</h3>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-b border-slate-100">
                <label className="block text-sm font-semibold text-slate-900 mb-2">Actual Cash Count</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={`block w-full pl-8 pr-4 py-3 bg-white border-2 ${colors.neutral.border} rounded-xl text-lg font-bold text-slate-900 focus:border-blue-500 focus:ring-0 transition-colors`}
                    placeholder="Enter cash amount"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                  />
                </div>
              </div>

              <div className={`p-5 transition-colors ${difference === 0 ? 'bg-emerald-50' : difference > 0 ? 'bg-orange-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${colors.neutral.text}`}>Difference</p>
                <div className="flex items-center gap-2">
                  {difference === 0 ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-xl font-bold text-emerald-600">₹0 <span className="text-sm font-medium ml-1">(Perfect)</span></span>
                    </>
                  ) : difference > 0 ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <span className="text-xl font-bold text-orange-600">+{formatCurrency(difference).replace('₹', '₹ ')} <span className="text-sm font-medium ml-1">(Extra Cash)</span></span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-xl font-bold text-red-600">-{formatCurrency(Math.abs(difference)).replace('₹', '₹ ')} <span className="text-sm font-medium ml-1">(Cash Short)</span></span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Closing Notes */}
        <section>
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 px-1">Closing Notes</h2>
          <Card className={`shadow-sm ${colors.neutral.border} overflow-hidden rounded-2xl bg-white`}>
            <CardContent className="p-4 sm:p-5">
              <textarea
                className={`w-full h-32 ${colors.neutral.bg} border-0 focus:ring-0 p-3 text-sm text-slate-700 placeholder:text-slate-400 rounded-xl resize-none`}
                placeholder="Example:
• Cash shortage
• Paid courier
• Rain affected sales"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              ></textarea>
            </CardContent>
          </Card>
        </section>
        
        <div className="pt-4">
          <Button 
            size="lg" 
            onClick={(e) => { if (requirePermission(e)) handleSave(); }}
            disabled={saving}
            className={cn(`w-full ${moduleTheme.dailyClosing.bg} ${moduleTheme.dailyClosing.bgHover} text-white font-bold h-14 rounded-2xl shadow-md ${moduleTheme.dailyClosing.shadow} text-lg`, !isOwner() && "opacity-50 cursor-not-allowed")}
          >
            {saving ? 'Saving...' : (isResubmitting ? 'Update Closing' : "Close Today's Business")}
          </Button>
        </div>
      </main>
    </div>
  );
}
