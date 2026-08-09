import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Loader2, RefreshCw, Calendar,
  CreditCard, FileText, CheckCircle2, Edit, Trash2,
  X, AlertCircle, Landmark, Hash, Tag,
} from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { businessFundsService } from '../services/businessFunds.service';
import { BusinessFundsTransaction } from '../types/businessFunds';
import { AddBusinessFundsModal } from '../components/AddBusinessFundsModal';
import { Button } from '@/components/ui/button';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  EmptyState,
  FinancialCard,
  ModuleSearchBar,
  SegmentTabs,
  ExportButton
} from '../components/shared';
import { BusinessDateNavigator } from '../components/shared';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { businessFundsExportProvider } from '../services/export/providers/businessFundsExportProvider';


type FilterChip = 'All' | 'Cash' | 'UPI' | 'Bank' | 'Today' | 'This Week' | 'This Month';
const FILTER_CHIPS: FilterChip[] = ['All', 'Cash', 'UPI', 'Bank', 'Today', 'This Week', 'This Month'];

export default function BusinessFundsHistory() {
  const [funds, setFunds] = useState<BusinessFundsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { isOpen: isAddOpen, openModal: openAdd, closeModal: closeAdd } = useModalNavigation('funds-add');
  const [editingTx, setEditingTx] = useState<BusinessFundsTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<BusinessFundsTransaction | null>(null);
  const { selectedDate, setSelectedDate, previousDay, nextDay, isToday: isBusinessDateToday } = useBusinessDate();
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOwner, requirePermission } = usePermissions();

  const loadData = useCallback(async () => {
    try {
      const data = await businessFundsService.getAllTransactions();
      setFunds(data);
    } catch (error) {
      console.error('Failed to load business funds:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    window.addEventListener('app-data-refresh', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      };
  }, [loadData]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleEditClick = (tx: BusinessFundsTransaction, e: React.MouseEvent) => {
    if (!requirePermission(e)) return;
    e.stopPropagation();
    setEditingTx(tx);
    openAdd();
  };

  const handleDeleteClick = (tx: BusinessFundsTransaction, e: React.MouseEvent) => {
    if (!requirePermission(e)) return;
    e.stopPropagation();
    setDeletingTx(tx);
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;
    setIsDeleting(true);
    try {
      await businessFundsService.deleteTransaction(deletingTx.id);
      setSuccessMessage('Transaction deleted successfully');
      window.dispatchEvent(new Event('app-data-refresh'));
      setDeletingTx(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFunds = useMemo(() => {
    return funds.filter((tx) => {
      // Search
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch =
        (tx.reason || '').toLowerCase().includes(searchStr) ||
        (tx.notes || '').toLowerCase().includes(searchStr) ||
        tx.amount.toString().includes(searchStr);

      if (!matchesSearch) return false;

      // Chips
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Cash') return tx.payment_method === 'Cash';
      if (activeFilter === 'UPI') return tx.payment_method === 'UPI';
      if (activeFilter === 'Bank') return tx.payment_method === 'Bank';

      const txDate = parseISO(tx.business_date);
      if (activeFilter === 'Today') return isToday(txDate);
      if (activeFilter === 'This Week') return isThisWeek(txDate);
      if (activeFilter === 'This Month') return isThisMonth(txDate);

      return true;
    });
  }, [funds, searchQuery, activeFilter]);


  const formatBusinessDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown Date';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className={`min-h-screen ${colors.neutral.bg} pb-20`}>
      <AppHeaderBanner
        theme="businessFunds"
        title="Business Funds"
        subtitle="History & Injections"
        icon={Landmark}
        backTo="/expenses"
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
            title="TOTAL FUNDS" 
            amount={filteredFunds.reduce((sum, tx) => sum + (tx.amount || 0), 0)} 
          />
          {filteredFunds.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => businessFundsExportProvider.getExportData(filteredFunds)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Plus} 
            label="Add Funds" 
            onClick={(e) => {
              if (requirePermission(e)) {
                setEditingTx(null);
                openAdd();
              }
            }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
          <ModuleActionButton 
            icon={RefreshCw} 
            label={isRefreshing ? "Refreshing..." : "Refresh"} 
            onClick={handleRefreshClick} 
            variant="glass"
            disabled={isRefreshing}
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      {successMessage && (
        <div className="fixed top-20 left-4 right-4 z-30 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      <div className="px-4 sm:px-6 mt-6 space-y-4">
        {/* Search */}
        <div className="mb-4">
          <ModuleSearchBar
            placeholder="Search reason, notes, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <SegmentTabs 
            tabs={FILTER_CHIPS.map(chip => ({ id: chip, label: chip }))}
            activeTab={activeFilter}
            onChange={(id) => setActiveFilter(id as FilterChip)}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
              <p>Loading history...</p>
            </div>
          ) : filteredFunds.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">No funds found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            filteredFunds.map((tx) => (
              <FinancialCard
                key={tx.id}
                title={tx.reason || 'Working Capital'}
                subtitle={formatBusinessDate(tx.business_date)}
                amount={tx.amount}
                amountColor="text-emerald-600"
                icon={Landmark}
                theme="businessFunds"
                badge={
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.neutral.text} bg-slate-100 flex items-center gap-1`}>
                    {tx.payment_method === 'Cash' ? (
                      <Landmark className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <CreditCard className="w-3 h-3 text-blue-600" />
                    )}
                    {tx.payment_method}
                  </span>
                }
              >
                {tx.notes && (
                  <p className={`text-sm ${colors.neutral.text} bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2 mx-5 mt-2 line-clamp-2`}>
                    {tx.notes}
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-3 pt-3 px-5 pb-3 border-t border-slate-100 bg-slate-50 rounded-b-[20px]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleEditClick(tx, e)}
                    className={`${colors.neutral.text} ${colors.neutral.border} hover:bg-slate-100 bg-white ${!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit className="w-4 h-4 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteClick(tx, e)}
                    className={`text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 bg-white ${!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </FinancialCard>
            ))
          )}
        </div>
      </div>

      <AddBusinessFundsModal
        isOpen={isAddOpen}
        onClose={() => {
          closeAdd();
          setEditingTx(null);
        }}
        initialData={editingTx}
      />

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingTx(null)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Transaction?</h3>
              <p className="text-slate-500 mb-6">
                Are you sure you want to delete this {formatCurrency(deletingTx.amount)} transaction? This will automatically update your Daily Closing and balances.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeletingTx(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
