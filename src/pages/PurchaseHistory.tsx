import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Search, Plus, Loader2, RefreshCw, Filter, Calendar, 
  IndianRupee, Tag, FileText, CheckCircle2, Edit, Trash2, Eye, X, AlertCircle, ShoppingCart 
} from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { stockService } from '../services/stock.service';
import { vendorService } from '../services/vendor.service';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardStore } from '../store/dashboard.store';
import { StockPurchase } from '../types/stock';
import { Vendor } from '../types/vendor';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { usePermissions } from '../hooks/usePermissions';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { useSmartBack } from '../hooks/useSmartBack';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup,
  ModuleActionButton,
  ModuleSearchBar,
  EmptyState,
  FinancialCard,
  CardActionBar,
  ExportButton
} from '../components/shared';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../lib/utils';
import { stockExportProvider } from '../services/export/providers/stockExportProvider';


type FilterChip = 'All' | 'Paid' | 'Partial' | 'Credit' | 'Today' | 'This Week' | 'This Month';

export default function PurchaseHistory() {
  const { smartBack } = useSmartBack();
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [vendorsMap, setVendorsMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');

  // Modals state
  const { isOpen: isAddPurchaseOpen, openModal: openAddPurchase, closeModal: closeAddPurchase } = useModalNavigation('stock-history-add');
  const [editingPurchase, setEditingPurchase] = useState<StockPurchase | undefined>(undefined);
  const { isOpen: isViewOpen, openModal: openView, closeModal: closeView } = useModalNavigation('stock-history-view');
  const [viewingPurchase, setViewingPurchase] = useState<StockPurchase | null>(null);
  const { isOpen: isDeleteOpen, openModal: openDelete, closeModal: closeDelete } = useModalNavigation('stock-history-delete');
  const [deletingPurchase, setDeletingPurchase] = useState<StockPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isOwner, requirePermission } = usePermissions();

  const loadData = useCallback(async () => {
    try {
      const [purchaseData, vendorList] = await Promise.all([
        stockService.getPurchases(),
        vendorService.getVendors(),
      ]);

      const map: Record<string, string> = {};
      vendorList.forEach((v) => {
        map[v.id] = v.name;
      });

      setPurchases(purchaseData);
      setVendorsMap(map);
    } catch (err) {
      console.error('Error loading purchase history:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
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

  // Filter & Search logic
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const vendorName = vendorsMap[p.vendor_id] || '';
      const invoiceNo = p.invoice_number || '';
      const queryLower = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !queryLower ||
        vendorName.toLowerCase().includes(queryLower) ||
        invoiceNo.toLowerCase().includes(queryLower);

      if (!matchesSearch) return false;

      const purchaseDate = parseISO(p.purchase_date);

      switch (activeFilter) {
        case 'Paid':
          return p.payment_type === 'paid';
        case 'Partial':
          return p.payment_type === 'partial';
        case 'Credit':
          return p.payment_type === 'credit';
        case 'Today':
          return isToday(purchaseDate);
        case 'This Week':
          return isThisWeek(purchaseDate, { weekStartsOn: 1 });
        case 'This Month':
          return isThisMonth(purchaseDate);
        default:
          return true;
      }
    });
  }, [purchases, vendorsMap, searchQuery, activeFilter]);

  // Edit action
  const handleOpenEdit = (p: StockPurchase) => {
    setEditingPurchase(p);
    openAddPurchase();
  };

  // Delete action
  const handleConfirmDelete = async () => {
    if (!deletingPurchase) return;
    setIsDeleting(true);
    try {
      await stockService.deletePurchase(deletingPurchase.id);

      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      window.dispatchEvent(new Event('dashboard-refresh'));
      window.dispatchEvent(new Event('storage'));

      closeDelete();
      setDeletingPurchase(null);
      showToast('Purchase deleted successfully');
      loadData();
    } catch (err: unknown) {
      console.error('Error deleting purchase:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading purchase history...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="stock"
        title="Purchase History"
        icon={ShoppingCart}
        onBack={() => smartBack('/stock')}
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="TOTAL PURCHASES" 
            amount={filteredPurchases.reduce((sum, p) => sum + p.purchase_amount, 0)} 
          />
          {filteredPurchases.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => stockExportProvider.getExportData(filteredPurchases, vendorsMap)}
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
              setEditingPurchase(undefined);
              openAddPurchase();
            }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 space-y-6 mt-6 relative z-20">
        {/* Search Bar */}
        <ModuleSearchBar 
          placeholder="Search by vendor name or invoice number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(
            ['All', 'Paid', 'Partial', 'Credit', 'Today', 'This Week', 'This Month'] as const
          ).map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === chip
                  ? 'bg-purple-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

      {/* List / Empty States */}
      {purchases.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No purchases recorded"
          subtitle="Click '+ Add Purchase' to record your first stock purchase."
          action={
            <Button
              onClick={(e) => {
                if (!requirePermission(e)) return;
                setEditingPurchase(undefined);
                openAddPurchase();
              }}
              className={cn("bg-purple-600 hover:bg-purple-700 text-white", !isOwner() && "opacity-50 cursor-not-allowed")}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Purchase
            </Button>
          }
        />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="No matching purchases"
          subtitle="Try adjusting your search query or filter chips."
        />
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => {
            const vendorName = vendorsMap[purchase.vendor_id] || 'Unknown Vendor';
            const isCredit = purchase.payment_type === 'credit';
            const isPaid = purchase.payment_type === 'paid';
            const isPartial = purchase.payment_type === 'partial';

            return (
              <FinancialCard
                key={purchase.id}
                title={vendorName}
                subtitle={format(parseISO(purchase.purchase_date), 'dd MMM yyyy')}
                amount={purchase.purchase_amount}
                icon={ShoppingCart}
                theme="stock"
                badge={
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isPartial
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {purchase.payment_type}
                      {isPartial && ` (Paid ${formatCurrency(purchase.paid_amount)})`}
                    </span>
                    {purchase.invoice_number && (
                      <span className="inline-flex items-center text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        <Tag className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                        {purchase.invoice_number}
                      </span>
                    )}
                  </div>
                }
                onClick={() => {
                  setViewingPurchase(purchase);
                  openView();
                }}
                onEdit={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(purchase);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setDeletingPurchase(purchase);
                  openDelete();
                }}
              >
                {purchase.notes && (
                  <p className={`text-sm ${colors.neutral.text} bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2 mx-5 mt-2 line-clamp-2 italic`}>
                    {purchase.notes}
                  </p>
                )}
              </FinancialCard>
            );
          })}
        </div>
      )}
      </div>

      {/* Add / Edit Purchase Modal */}
      <AddPurchaseModal
        isOpen={isAddPurchaseOpen}
        initialPurchase={editingPurchase}
        onClose={() => {
          closeAddPurchase();
          setEditingPurchase(undefined);
        }}
        onSuccess={() => {
          showToast(editingPurchase ? 'Purchase updated successfully' : 'Purchase added successfully');
          loadData();
        }}
      />

      {/* View Details Modal */}
      {isViewOpen && viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeView}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Purchase Details</h3>
              <button
                onClick={closeView}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Vendor</span>
                <span className="font-semibold text-slate-900">
                  {vendorsMap[viewingPurchase.vendor_id] || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Invoice Number</span>
                <span className="font-mono text-slate-900">
                  {viewingPurchase.invoice_number || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Purchase Date</span>
                <span className="text-slate-900">
                  {format(parseISO(viewingPurchase.purchase_date), 'dd MMMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Purchase Amount</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(viewingPurchase.purchase_amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Payment Type</span>
                <span className="capitalize font-semibold text-slate-900">
                  {viewingPurchase.payment_type}
                </span>
              </div>
              {viewingPurchase.payment_type === 'partial' && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Amount Paid</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(viewingPurchase.paid_amount)}
                  </span>
                </div>
              )}
              {viewingPurchase.payment_method && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-medium text-slate-900">{viewingPurchase.payment_method}</span>
                </div>
              )}
              {viewingPurchase.notes && (
                <div className="pt-2">
                  <span className="text-slate-500 font-medium block mb-1">Notes</span>
                  <p className={`${colors.neutral.bg} p-3 rounded-lg text-slate-700 text-xs`}>
                    {viewingPurchase.notes}
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

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deletingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDelete}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Delete Purchase</h3>
              <button
                onClick={closeDelete}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>
                  Are you sure you want to delete purchase of{' '}
                  <strong>{formatCurrency(deletingPurchase.purchase_amount)}</strong> from{' '}
                  <strong>{vendorsMap[deletingPurchase.vendor_id] || 'Vendor'}</strong>? This will adjust vendor outstanding balance.
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
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Purchase'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
