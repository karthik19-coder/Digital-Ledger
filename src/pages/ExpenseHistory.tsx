import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Loader2, RefreshCw, Calendar, Filter,
  CreditCard, FileText, CheckCircle2, Edit, Trash2, Eye,
  X, AlertCircle, ReceiptText, Hash, Tag,
} from 'lucide-react';
import { format, isToday as isDateToday, isThisWeek, isThisMonth, parseISO, isSameDay } from 'date-fns';
import { expenseService } from '../services/expense.service';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardStore } from '../store/dashboard.store';
import { Expense } from '../types/expense';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { usePermissions } from '../hooks/usePermissions';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { useSmartBack } from '../hooks/useSmartBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup,
  ModuleActionButton,
  ModuleSearchBar,
  EmptyState,
  FinancialCard,
  CardActionBar,
  BusinessDateNavigator,
  ExportButton
} from '../components/shared';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { expensesExportProvider } from '../services/export/providers/expensesExportProvider';


type FilterChip =
  | 'All'
  | 'Business'
  | 'Personal'
  | 'Cash'
  | 'UPI'
  | 'Bank'
  | 'Today'
  | 'This Week'
  | 'This Month';

const FILTER_CHIPS: FilterChip[] = [
  'All',
  'Business',
  'Personal',
  'Cash',
  'UPI',
  'Bank',
  'Today',
  'This Week',
  'This Month',
];

export default function ExpenseHistory() {
  const { smartBack } = useSmartBack();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isOwner, requirePermission } = usePermissions();

  const { selectedDate, setSelectedDate, previousDay, nextDay, isToday: isBusinessDateToday } = useBusinessDate();

  // Modal states
  const { isOpen: isAddEditOpen, openModal: openAddEdit, closeModal: closeAddEdit } = useModalNavigation('expense-history-add-edit');
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { isOpen: isViewOpen, openModal: openView, closeModal: closeView } = useModalNavigation('expense-history-view');
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const { isOpen: isDeleteOpen, openModal: openDelete, closeModal: closeDelete } = useModalNavigation('expense-history-delete');
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await expenseService.getAllExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expense history:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('expenses-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const dispatchRefresh = async () => {
    const summary = await dashboardService.getDailySummary();
    useDashboardStore.setState(summary as any);
    window.dispatchEvent(new Event('dashboard-refresh'));
    window.dispatchEvent(new Event('storage'));
  };

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter((e) => {
      // Search: category, notes, reference_number, payment_method
      const matchesSearch =
        !q ||
        e.category.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q) ||
        (e.reference_number ?? '').toLowerCase().includes(q) ||
        e.payment_method.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      let date: Date;
      try {
        date = parseISO(e.expense_date);
      } catch {
        date = new Date();
      }

      switch (activeFilter) {
        case 'Business':
          return e.expense_type === 'business';
        case 'Personal':
          return e.expense_type === 'personal';
        case 'Cash':
          return e.payment_method === 'Cash';
        case 'UPI':
          return e.payment_method === 'UPI';
        case 'Bank':
          return e.payment_method === 'Bank';
        case 'Today':
          return isDateToday(date);
        case 'This Week':
          return isThisWeek(date, { weekStartsOn: 1 });
        case 'This Month':
          return isThisMonth(date);
        default:
          return true;
      }
    });
  }, [expenses, searchQuery, activeFilter]);

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    openAddEdit();
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await expenseService.deleteExpense(deletingExpense.id);
      await dispatchRefresh();
      closeDelete();
      setDeletingExpense(null);
      showToast('Expense deleted successfully');
      loadData();
    } catch (err: unknown) {
      console.error('Error deleting expense:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateLong = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading expense history...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* ─── Toast ──────────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* ─── Header Banner ──────────────────────────────────────────────────── */}
      <AppHeaderBanner
        theme="expenses"
        title="Expense History"
        icon={ReceiptText}
        onBack={() => smartBack('/expenses')}
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="TOTAL EXPENSES" 
            amount={filteredExpenses.reduce((sum, e) => sum + e.amount, 0)} 
          />
          {filteredExpenses.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => expensesExportProvider.getExportData(filteredExpenses)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Filter} 
            label="Filter" 
            onClick={() => {}} 
            variant="glass" 
          />
          <ModuleActionButton 
            icon={RefreshCw} 
            label="Refresh" 
            onClick={handleManualRefresh} 
            variant="glass"
          />
          <ModuleActionButton 
            icon={Plus} 
            label="Add" 
            onClick={(e) => {
              if (!requirePermission(e)) return;
              setEditingExpense(undefined);
              openAddEdit();
            }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 space-y-6 mt-6 relative z-20">
        {/* Search Bar */}
        <ModuleSearchBar 
          placeholder="Search by category, notes, payment method or ref number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === chip
                  ? 'bg-red-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {chip === 'Business' ? 'Business Expenses' : chip === 'Personal' ? 'Personal Withdrawals' : chip}
            </button>
          ))}
        </div>

      {/* ─── Results count ──────────────────────────────────────────────────── */}
      {expenses.length > 0 && (
        <p className="text-xs text-slate-500 mb-1">
          Showing <span className="font-semibold text-slate-700">{filteredExpenses.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{expenses.length}</span> expenses
        </p>
      )}

      {/* ─── Empty States ────────────────────────────────────────────────────── */}
      {expenses.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No expenses recorded"
          subtitle="Tap '+ Add Expense' to record your first expense."
          action={
            <Button
              onClick={(e) => {
                if (!requirePermission(e)) return;
                setEditingExpense(undefined);
                openAddEdit();
              }}
              className={cn(`${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white`, !isOwner() && "opacity-50 cursor-not-allowed")}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Button>
          }
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="No matching expenses"
          subtitle="Try adjusting your search or filter."
        />
      ) : (
        /* ─── Expense Cards ──────────────────────────────────────────────── */
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const isBusiness = expense.expense_type === 'business';

            return (
              <FinancialCard
                key={expense.id}
                title={expense.category}
                subtitle={formatDate(expense.expense_date)}
                amount={expense.amount}
                icon={ReceiptText}
                theme="expenses"
                badge={
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isBusiness
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-purple-50 text-purple-600 border border-purple-200'
                      }`}
                    >
                      {isBusiness ? 'Business' : 'Personal'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                      <CreditCard className="w-2.5 h-2.5" />
                      {expense.payment_method}
                    </span>
                  </div>
                }
                onClick={() => {
                  setViewingExpense(expense);
                  openView();
                }}
                onEdit={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(expense);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setDeletingExpense(expense);
                  openDelete();
                }}
              >
                {(expense.notes || expense.reference_number) && (
                  <div className={`text-sm ${colors.neutral.text} bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2 mx-5 mt-2`}>
                    {expense.notes && <p className="italic line-clamp-2">{expense.notes}</p>}
                    {expense.reference_number && (
                      <p className="text-xs font-mono mt-1 text-slate-500 flex items-center">
                        <Hash className="w-3 h-3 mr-1" />
                        {expense.reference_number}
                      </p>
                    )}
                  </div>
                )}
              </FinancialCard>
            );
          })}
        </div>
      )}
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────────────────────── */}
      <AddExpenseModal
        isOpen={isAddEditOpen}
        initialExpense={editingExpense}
        onClose={() => {
          closeAddEdit();
          setEditingExpense(undefined);
        }}
        onSuccess={() => {
          showToast(editingExpense ? 'Expense updated successfully' : 'Expense added successfully');
          closeAddEdit();
          setEditingExpense(undefined);
          loadData();
        }}
      />

      {/* ─── View Details Modal ───────────────────────────────────────────────── */}
      {isViewOpen && viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeView}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${moduleTheme.expenses.bgLight} rounded-lg`}>
                  <ReceiptText className={`w-5 h-5 ${moduleTheme.expenses.text}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Expense Details</h3>
              </div>
              <button
                onClick={closeView}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-0 text-sm">
              {[
                {
                  label: 'Category',
                  value: viewingExpense.category,
                  icon: <Tag className="w-3.5 h-3.5 text-slate-400" />,
                },
                {
                  label: 'Expense Type',
                  value: (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        viewingExpense.expense_type === 'business'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-purple-50 text-purple-600 border border-purple-200'
                      }`}
                    >
                      {viewingExpense.expense_type === 'business' ? 'Business Expense' : 'Personal Withdrawal'}
                    </span>
                  ),
                },
                {
                  label: 'Amount',
                  value: (
                    <span className={`font-bold ${moduleTheme.expenses.text} text-base`}>
                      {formatCurrency(viewingExpense.amount)}
                    </span>
                  ),
                },
                {
                  label: 'Payment Method',
                  value: viewingExpense.payment_method,
                  icon: <CreditCard className="w-3.5 h-3.5 text-slate-400" />,
                },
                {
                  label: 'Expense Date',
                  value: formatDateLong(viewingExpense.expense_date),
                  icon: <Calendar className="w-3.5 h-3.5 text-slate-400" />,
                },
                {
                  label: 'Reference Number',
                  value: viewingExpense.reference_number ? (
                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {viewingExpense.reference_number}
                    </span>
                  ) : (
                    '—'
                  ),
                },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    {icon}
                    {label}
                  </span>
                  <span className="font-semibold text-slate-900 text-right">{value}</span>
                </div>
              ))}

              {/* Notes section */}
              {viewingExpense.notes && (
                <div className="pt-3">
                  <span className="text-slate-500 font-medium block mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Notes
                  </span>
                  <p className={`${colors.neutral.bg} p-3 rounded-lg text-slate-700 text-xs leading-relaxed`}>
                    {viewingExpense.notes}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={closeView}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ────────────────────────────────────────── */}
      {isDeleteOpen && deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDelete}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Delete Expense?</h3>
              <button
                onClick={closeDelete}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className={`p-3 ${moduleTheme.expenses.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>
                  Are you sure you want to delete the{' '}
                  <strong>{deletingExpense.category}</strong> expense of{' '}
                  <strong>{formatCurrency(deletingExpense.amount)}</strong>?
                  {deletingExpense.payment_method !== 'Bank' && (
                    <> This will restore <strong>{deletingExpense.payment_method}</strong> balance.</>
                  )}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeDelete}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white font-semibold`}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
