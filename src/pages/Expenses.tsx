import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ReceiptText, Plus, RefreshCw, CheckCircle2, Calendar, 
  CreditCard, ChevronRight, Users, CalendarDays, BadgeIndianRupee, 
  Loader2, Lock, Landmark, FileText, Receipt, History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { expenseService } from '../services/expense.service';
import { closingService } from '../services/closing.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { ExpenseSummaryData } from '../types/expense';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseCategoriesModal } from '../components/ExpenseCategoriesModal';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  EmptyState,
  FinancialCard,
  SectionHeader
} from '../components/shared';
import { moduleTheme, colors } from '../theme';

import { useQueryCache } from '../hooks/useQueryCache';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { useSmartBack } from '../hooks/useSmartBack';

import { usePermissions } from '../hooks/usePermissions';

export default function Expenses() {
  const navigate = useNavigate();
  const { smartBack } = useSmartBack();
  const { selectedDate } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const cacheKey = `expenses-${dateStr}`;
  const { isOwner, requirePermission } = usePermissions();

  const loadData = async () => {
    const [summary, closed] = await Promise.all([
      expenseService.getExpensesSummary(dateStr),
      closingService.isDayClosed(dateStr)
    ]);
    return { summary, closed };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadExpenses } = useQueryCache(
    cacheKey,
    loadData,
    [selectedDate]
  );

  const data = cachedRes?.summary || null;
  const isDayClosed = cachedRes?.closed || false;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModalNavigation('expenses-add');
  const { isOpen: isCategoriesModalOpen, openModal: openCategoriesModal, closeModal: closeCategoriesModal } = useModalNavigation('expenses-categories');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRefresh = () => loadExpenses();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('expenses-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadExpenses]);

  const handleExpenseAdded = () => {
    closeAddModal();
    setSuccessMessage('Expense added successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    loadExpenses();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="expenses"
        title="Daily Expenses"
        icon={Receipt}
        backTo="/"
      >
        <HeaderSummaryCard 
          title="TOTAL EXPENSES" 
          amount={data?.todayExpenses || 0} 
        />
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Plus} 
            label="Add Expense" 
            onClick={(e) => { if (requirePermission(e)) openAddModal(); }} 
            variant="glass" 
            disabled={isDayClosed}
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
          <ModuleActionButton 
            icon={History} 
            label="History" 
            onClick={() => navigate('/expenses/history')} 
            variant="glass" 
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6 mt-6 relative z-20 max-w-md lg:max-w-5xl mx-auto w-full">
        {/* Navigation Cards Grid: Side-by-side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Employees & Payroll Navigation Card */}
          <FinancialCard
            title="Employees & Payroll"
            subtitle="Manage attendance & salary"
            icon={Users}
            theme="salary"
            onClick={() => navigate('/expenses/employees')}
            className="border border-blue-100"
            badge={<ChevronRight className="w-5 h-5 text-slate-400" />}
          />

          {/* Business Funds History Navigation Card */}
          <FinancialCard
            title="Business Funds History"
            subtitle="View injected capital"
            icon={Landmark}
            theme="businessFunds"
            onClick={() => navigate('/business-funds')}
            className="border border-emerald-100"
            badge={<ChevronRight className="w-5 h-5 text-slate-400" />}
          />
        </div>

        {/* Recent Expenses */}
        <div className="space-y-4">
          <SectionHeader title="Recent Expenses" />
          {!data?.recentExpenses || data.recentExpenses.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No expenses recorded yet"
              subtitle="Tap 'Add Expense' to get started."
            />
          ) : (
            <div className="space-y-3">
              {data.recentExpenses.map((expense) => (
                <FinancialCard
                  key={expense.id}
                  title={expense.category}
                  subtitle={format(new Date(expense.expense_date), 'dd MMM yyyy')}
                  amount={expense.amount}
                  amountColor="text-red-600"
                  icon={ReceiptText}
                  theme="expenses"
                  badge={
                    expense.expense_type && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 flex-shrink-0 ${
                        expense.expense_type === 'personal' 
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {expense.expense_type === 'personal' ? 'Personal' : 'Business'}
                      </span>
                    )
                  }
                />
              ))}
            </div>
          )}
          
          {data && data.recentExpenses && data.recentExpenses.length > 0 && (
            <div className="pt-2 flex justify-center">
              <ModuleActionButton 
                label="View Complete History"
                variant="primary"
                onClick={() => navigate('/expenses/history')}
                className="w-full sm:w-auto sm:min-w-[240px] justify-center"
                icon={History}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSuccess={handleExpenseAdded}
      />
      <ExpenseCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={closeCategoriesModal}
      />
    </div>
  );
}
