import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar as CalendarIcon, ArrowLeft, MoreVertical, Plus, Trash2, Tag, IndianRupee, CreditCard, Wallet, Search, SearchX, CheckCircle2, Loader2, FileText, Hash, Lock, AlertCircle, ChevronLeft, ChevronRight, Users, X, AlertTriangle, RefreshCw, Edit2 } from 'lucide-react';
import { format, isAfter, startOfDay, isFuture } from 'date-fns';
import { BusinessDateNavigator } from '../components/shared';
import { useBusinessDate } from '../hooks/useBusinessDate';

import { salesService, DailySaleSummary } from '../services/sales.service';
import { dashboardService } from '../services/dashboard.service';
import { transactionService } from '../services/transaction.service';
import { closingService } from '../services/closing.service';
import { useDashboardStore } from '../store/dashboard.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton, 
  SummaryCard, 
  PrimaryActionButton,
  SectionHeader,
  ExportButton
} from '../components/shared';
import { cn } from '../lib/utils';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { PageHero, HistoryCard } from '../components/shared';
import { salesExportProvider } from '../services/export/providers/salesExportProvider';


const salesSchema = z.object({
  sale_date: z.string().nonempty('Date is required').refine((date) => {
    return !isAfter(startOfDay(new Date(date)), startOfDay(new Date()));
  }, 'Cannot select future date'),
  cash_sales: z.number({ message: 'Must be a number' }).min(0, 'Cannot be negative'),
  upi_sales: z.number({ message: 'Must be a number' }).min(0, 'Cannot be negative'),
  reference_number: z.string().max(100, 'Maximum 100 characters').optional(),
  notes: z.string().max(500, 'Maximum 500 characters').optional(),
});

type SalesFormValues = z.infer<typeof salesSchema>;

import { useQueryCache } from '../hooks/useQueryCache';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { useFormBlocker } from '../hooks/useFormBlocker';


export default function Sales() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clear day confirmation modal
  const { isOpen: showClearModal, openModal: openClearModal, closeModal: closeClearModal } = useModalNavigation('sales-clear-modal');
  const [isClearing, setIsClearing] = useState(false);
  
  const { isOwner, requirePermission } = usePermissions();

  const { selectedDate, setSelectedDate, previousDay, nextDay, isToday: isBusinessDateToday } = useBusinessDate();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const cacheKey = `sales-${selectedDateStr}`;

  const fetchData = async () => {
    if (!selectedDateStr || isAfter(startOfDay(new Date(selectedDateStr)), startOfDay(new Date()))) {
      return { 
        summary: { cash_total: 0, upi_total: 0, credit_total: 0, total: 0, transaction_count: 0 }, 
        closedStatus: false,
        transactions: []
      };
    }
    const [result, closedStatus, transactions] = await Promise.all([
      salesService.getDailySummaryForDate(selectedDateStr),
      closingService.isDayClosed(selectedDateStr),
      salesService.getTransactionsForDate(selectedDateStr)
    ]);
    return { summary: result, closedStatus, transactions };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadSummary } = useQueryCache(
    cacheKey,
    fetchData,
    [selectedDateStr]
  );
  
  const summary = cachedRes?.summary || { cash_total: 0, upi_total: 0, credit_total: 0, total: 0, transaction_count: 0 };
  const isDayClosed = cachedRes?.closedStatus || false;
  const existingSale = cachedRes?.transactions?.[0] || null;

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      sale_date: selectedDateStr,
      cash_sales: 0,
      upi_sales: 0,
      reference_number: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (existingSale) {
      form.reset({
        sale_date: selectedDateStr,
        cash_sales: existingSale.cash_sales,
        upi_sales: existingSale.upi_sales,
        reference_number: existingSale.reference_number || '',
        notes: existingSale.notes || '',
      });
    } else {
      form.reset({
        sale_date: selectedDateStr,
        cash_sales: 0,
        upi_sales: 0,
        reference_number: '',
        notes: '',
      });
    }
  }, [existingSale, selectedDateStr, form]);

  useFormBlocker(form.formState.isDirty && !isSubmitting);

  // Sync form date when global selected date changes
  useEffect(() => {
    const currentFormDate = form.getValues('sale_date');
    if (selectedDateStr !== currentFormDate) {
      form.setValue('sale_date', selectedDateStr);
    }
  }, [selectedDateStr, form]);

  const formDate = form.watch('sale_date');

  // Auto-refresh when dashboard updates
  useEffect(() => {
    const handleRefresh = () => {
      loadSummary();
    };
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('business-date-changed', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('business-date-changed', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [selectedDateStr]);

  const refreshDashboard = async () => {
    // Only fetch dashboard summary if we really need it in state,
    // but the transactionService already dispatches the refresh event.
    // To be completely safe without refactoring dashboard store logic right now:
    const dashSummary = await dashboardService.getDailySummary();
    useDashboardStore.setState(dashSummary as any);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const onSubmit = async (data: SalesFormValues) => {
    if (data.cash_sales === 0 && data.upi_sales === 0) {
      setSubmitError('Enter at least Cash or UPI amount.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setSubmitError(null);
    try {
      await transactionService.executeTransaction(
        data,
        data.sale_date,
        async () => {
          if (existingSale) {
            return salesService.updateSaleTransaction(existingSale.id, {
              sale_date: data.sale_date,
              cash_sales: data.cash_sales,
              upi_sales: data.upi_sales,
              reference_number: data.reference_number,
              notes: data.notes,
            });
          } else {
            return salesService.addSaleTransaction({
              sale_date: data.sale_date,
              cash_sales: data.cash_sales,
              upi_sales: data.upi_sales,
              reference_number: data.reference_number,
              notes: data.notes,
            });
          }
        },
        ['sales-refresh']
      );

      // Reload summary
      await loadSummary();

      // Refresh dashboard
      await refreshDashboard();

      showSuccess(existingSale ? 'Sale updated successfully' : 'Sale recorded successfully');
    } catch (error: unknown) {
      console.error('Error saving sales', error);
      setSubmitError('Failed to add sales. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDay = async () => {
    setIsClearing(true);
    setSubmitError(null);
    try {
      await transactionService.executeTransaction(
        { action: 'clear', date: selectedDateStr },
        selectedDateStr,
        () => salesService.clearSalesForDate(selectedDateStr),
        ['sales-refresh']
      );

      // Reload summary
      await loadSummary();

      // Refresh dashboard
      await refreshDashboard();

      closeClearModal();
      showSuccess(`All sales for ${formatDateDisplay(selectedDateStr)} cleared.`);

      // Reset form
      form.reset({
        sale_date: selectedDateStr,
        cash_sales: 0,
        upi_sales: 0,
        reference_number: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error clearing sales', error);
      setSubmitError('Failed to clear sales. Please try again.');
      closeClearModal();
    } finally {
      setIsClearing(false);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <div className={`flex flex-col min-h-screen ${colors.neutral.bg}`}>
      <div className="flex flex-col flex-1 pb-24 safe-page-pb">
        {/* Header Banner */}
        <AppHeaderBanner
          theme="sales"
          title="Daily Sales"
          icon={IndianRupee}
          backTo="/"
          rightAction={
            <BusinessDateNavigator
              selectedDate={selectedDate}
              onPrevious={previousDay}
              onNext={nextDay}
              onDateChange={setSelectedDate}
              disableNext={isBusinessDateToday}
            />
          }
        >
          <div className="relative">
            <HeaderSummaryCard 
              title="TOTAL SALES" 
              amount={summary.total} 
              subtitle={summary.transaction_count > 0 ? `${summary.transaction_count} entries` : undefined} 
            />
            {summary.transaction_count > 0 && (
              <div className="absolute top-4 right-4 z-20">
                <ExportButton 
                  data={() => salesExportProvider.getDailySalesExportData(selectedDateStr)}
                  className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
                />
              </div>
            )}
          </div>
          <HeaderActionGroup>
            <ModuleActionButton 
              icon={RefreshCw} 
              label="Refresh" 
              onClick={() => loadSummary()} 
              variant="glass" 
            />
            {summary.transaction_count > 0 && (
              <ModuleActionButton 
                icon={Trash2} 
                label="Clear Day" 
                onClick={(e) => { if (requirePermission(e)) openClearModal(); }} 
                variant="glass" 
                disabled={isDayClosed}
                className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
              />
            )}
          </HeaderActionGroup>
        </AppHeaderBanner>

        <div className="p-4 sm:p-6 space-y-6">

        {/* Cash / UPI / Credit Breakdown */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-0">
          <SummaryCard title="Cash" amount={summary.cash_total} icon={Wallet} />
          <SummaryCard title="UPI" amount={summary.upi_total} icon={CreditCard} />
          <SummaryCard title="Credit" amount={summary.credit_total} icon={Users} />
        </div>

        {/* Toast Notifications */}
        {successMessage && (
          <div className={`p-4 ${moduleTheme.sales.bgLight} text-green-700 text-sm rounded-xl font-medium border border-green-100 flex items-center`}>
            <div className={`w-2 h-2 ${moduleTheme.sales.bgLight}0 rounded-full mr-2 animate-pulse`}></div>
            {successMessage}
          </div>
        )}
        {submitError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl font-medium border border-red-100 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Input Section */}
        {isDayClosed ? (
          <div className={`${colors.neutral.bg} border ${colors.neutral.border} rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm`}>
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">🔒 Closed</h3>
            <p className="text-slate-500 text-sm max-w-sm">Editing is disabled for this day. Unlock Daily Closing from the Dashboard to make changes.</p>
          </div>
        ) : (
        <form onSubmit={(e) => {
          if (!requirePermission(e)) return;
          form.handleSubmit(onSubmit)(e);
        }} className="space-y-4">
          {/* Cash & UPI Inputs */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Cash Sales Input */}
            <Card className={`shadow-sm ${colors.neutral.border}`}>
              <CardContent className="p-2.5 p-4">
                <Label htmlFor="cash_sales" className={`text-[10px] sm:text-xs font-bold sm:font-semibold ${moduleTheme.sales.text} flex items-center gap-1.5 mb-1.5 sm:mb-2 uppercase tracking-wider`}>
                  <div className={`p-1 ${moduleTheme.sales.bgLight} rounded-md`}>
                    <Wallet className="w-3 h-3" />
                  </div>
                  Cash <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="cash_sales"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                        id="cash_sales"
                        type="text"
                        inputMode="numeric"
                        className={`h-9 sm:h-11 pl-6 sm:pl-7 font-mono text-base sm:text-lg bg-white ${colors.neutral.border} shadow-sm rounded-lg`}
                        disabled={isSubmitting || isLoading}
                        value={field.value !== undefined ? field.value : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          field.onChange(val ? Number(val) : 0);
                        }}
                      />
                    </div>
                  )}
                />
                {form.formState.errors.cash_sales && (
                  <p className="text-[10px] text-red-500 mt-1">{form.formState.errors.cash_sales.message}</p>
                )}
              </CardContent>
            </Card>

            {/* UPI Sales Input */}
            <Card className={`shadow-sm ${colors.neutral.border}`}>
              <CardContent className="p-2.5 p-4">
                <Label htmlFor="upi_sales" className="text-[10px] sm:text-xs font-bold sm:font-semibold text-blue-600 flex items-center gap-1.5 mb-1.5 sm:mb-2 uppercase tracking-wider">
                  <div className="p-1 bg-blue-50 rounded-md">
                    <CreditCard className="w-3 h-3" />
                  </div>
                  UPI <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="upi_sales"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                        id="upi_sales"
                        type="text"
                        inputMode="numeric"
                        className={`h-9 sm:h-11 pl-6 sm:pl-7 font-mono text-base sm:text-lg bg-white ${colors.neutral.border} shadow-sm rounded-lg`}
                        disabled={isSubmitting || isLoading}
                        value={field.value !== undefined ? field.value : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          field.onChange(val ? Number(val) : 0);
                        }}
                      />
                    </div>
                  )}
                />
                {form.formState.errors.upi_sales && (
                  <p className="text-[10px] text-red-500 mt-1">{form.formState.errors.upi_sales.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Credit Sales (Read-Only) */}
          <Card className={`shadow-sm ${colors.neutral.border}`}>
            <CardContent className="p-2.5 p-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <Label className="text-[10px] sm:text-xs font-bold sm:font-semibold text-orange-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <div className="p-1 bg-orange-50 rounded-md">
                    <Users className="w-3 h-3" />
                  </div>
                  Credit Sales
                </Label>
                <Lock className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                  type="text"
                  className={`h-9 sm:h-11 pl-6 sm:pl-7 font-mono text-base sm:text-lg text-orange-600 ${colors.neutral.bg} cursor-not-allowed select-none ${colors.neutral.border} shadow-sm rounded-lg`}
                  disabled={true}
                  readOnly={true}
                  tabIndex={-1}
                  value={summary.credit_total}
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Calculated automatically from Customer Credit.
              </p>
            </CardContent>
          </Card>



          {/* Action Buttons */}
          <div className="space-y-3">
            <PrimaryActionButton 
              theme="sales"
              type="submit" 
              loading={isSubmitting || isLoading}
              icon={existingSale ? Edit2 : Plus}
              className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
              onClick={requirePermission}
            >
              {existingSale ? "Edit Today's Sale" : "Add Sales"}
            </PrimaryActionButton>

            {summary.transaction_count > 0 && (
              <Button 
                type="button"
                variant="outline"
                className={cn("w-full h-11 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-sm font-medium rounded-xl", !isOwner() && "opacity-50 cursor-not-allowed")}
                disabled={isClearing || isLoading}
                onClick={(e) => { if (requirePermission(e)) openClearModal(); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Today's Sales
              </Button>
            )}
          </div>
        </form>
        )}
      </div>

      {/* Date Navigation & Settings Modals */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeClearModal}>
          <div 
            className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Clear Today's Sales?</h2>
              <button 
                onClick={closeClearModal}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You are about to permanently remove <strong>ALL {summary.transaction_count} sales {summary.transaction_count === 1 ? 'entry' : 'entries'}</strong> for
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateDisplay(selectedDateStr)}
                  </p>
                </div>
              </div>

              <div className={`${colors.neutral.bg} rounded-xl p-4 border border-slate-100 space-y-2 text-sm`}>
                <p className="font-medium text-slate-700">This action cannot be undone.</p>
                <p className="text-slate-500">This will update:</p>
                <ul className={`${colors.neutral.text} space-y-1 pl-4`}>
                  <li className="flex items-center gap-2">• Daily Sales</li>
                  <li className="flex items-center gap-2">• Dashboard</li>
                  <li className="flex items-center gap-2">• Cash Balance</li>
                  <li className="flex items-center gap-2">• UPI Balance</li>
                </ul>
                <p className="text-slate-500 pt-1">Customer Credit and Stock will <strong>NOT</strong> be affected.</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full sm:flex-1"
                  onClick={closeClearModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleClearDay}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Clearing...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" /> Clear Today's Sales</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
