import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, MapPin, Loader2, X, AlertCircle, 
  CheckCircle2, CreditCard, Calendar, FileText, Plus, Tag, Edit, Clock 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { stockService } from '../services/stock.service';
import { Vendor, VendorTransaction } from '../types/vendor';
import { vendorService } from '../services/vendor.service';
import { dashboardService } from '../services/dashboard.service';
import { transactionService } from '../services/transaction.service';
import { useDashboardStore } from '../store/dashboard.store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TransactionDatePicker } from '../components/TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  ModuleActionButton 
} from '../components/shared';
import { ExportButton } from '../components/shared/ExportButton';
import { vendorLedgerExportProvider } from '../services/export/providers/vendorLedgerExportProvider';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { cn } from '../lib/utils';

const formatBusinessDate = (dateStr?: string) => {
  if (!dateStr) return 'Unknown Date';
  try {
    const parsed = parseISO(dateStr);
    return format(parsed, 'dd MMM yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

interface DisplayLedgerGroup {
  id: string;
  type: 'purchase' | 'payment' | 'paid_purchase' | 'partial_purchase';
  business_date: string;
  created_at: string;
  purchase_amount?: number;
  paid_amount?: number;
  net_amount: number;
  payment_method?: 'Cash' | 'UPI' | 'Bank';
  reference?: string;
  reference_type?: string;
  notes?: string;
  runningBalance: number;
  originalTx: VendorTransaction;
}

export default function VendorDetails() {
  const { id } = useParams<{ id: string }>();
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [transactions, setTransactions] = useState<DisplayLedgerGroup[]>([]);
  const [rawTransactions, setRawTransactions] = useState<(VendorTransaction & { runningBalance: number })[]>([]);
  const [purchasesMap, setPurchasesMap] = useState<Record<string, string>>({});
  const [vendorPurchases, setVendorPurchases] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = useModalNavigation('vendor-payment');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Payment Transaction modal state
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModalNavigation('vendor-edit-payment');
  const [editingTransaction, setEditingTransaction] = useState<VendorTransaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Payment Modal state
  const { isOpen: isDeletingOpen, openModal: openDeleting, closeModal: closeDeleting } = useModalNavigation('vendor-delete-payment');
  const [deletingTransaction, setDeletingTransaction] = useState<VendorTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Purchase Modal state
  const { isOpen: isEditPurchaseOpen, openModal: openEditPurchase, closeModal: closeEditPurchase } = useModalNavigation('vendor-edit-purchase');
  const [editingPurchase, setEditingPurchase] = useState<any>(null);

  // Delete Purchase Modal state
  const { isOpen: isDeletingPurchaseOpen, openModal: openDeletingPurchase, closeModal: closeDeletingPurchase } = useModalNavigation('vendor-delete-purchase');
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [deletingPurchaseDetails, setDeletingPurchaseDetails] = useState<any>(null);
  const [isDeletingPurchase, setIsDeletingPurchase] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    const handleRefresh = () => {
      if (id) loadData();
    };
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!id) return;
      const v = await vendorService.getVendorById(id);
      if (!v) {
        smartBack('/stock/vendors');
        return;
      }
      setVendor(v);
      
      const txs = await vendorService.getVendorTransactions(id);
      const allPurchases = await stockService.getPurchases();
      
      const invoiceMap: Record<string, string> = {};
      const vPurchases = allPurchases.filter(p => p.vendor_id === id);
      setVendorPurchases(vPurchases);

      allPurchases.forEach(p => {
        if (p.invoice_number) {
          invoiceMap[p.id] = p.invoice_number;
        }
      });
      setPurchasesMap(invoiceMap);

      const oldestFirst = [...txs].sort((a, b) => {
        const timeA = new Date(a.business_date || a.date!).getTime();
        const timeB = new Date(b.business_date || b.date!).getTime();
        if (timeA !== timeB) return timeA - timeB;
        
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        if (createdA !== createdB) return createdA - createdB;
        
        if (a.type === 'purchase' && b.type === 'payment') return -1;
        if (a.type === 'payment' && b.type === 'purchase') return 1;
        
        return 0;
      });
      let currentBalance = 0;
      const displayGroups: DisplayLedgerGroup[] = [];
      const purchaseGroupMap = new Map<string, DisplayLedgerGroup>();

      for (const tx of oldestFirst) {
        if (tx.type === 'purchase') {
          currentBalance += tx.amount;
          
          const group: DisplayLedgerGroup = {
            id: tx.id,
            type: 'purchase',
            business_date: tx.business_date || tx.date!,
            created_at: tx.created_at,
            purchase_amount: tx.amount,
            paid_amount: 0,
            net_amount: tx.amount,
            reference: tx.reference,
            reference_type: tx.reference_type,
            notes: tx.notes,
            runningBalance: currentBalance,
            originalTx: tx as VendorTransaction
          };
          displayGroups.push(group);
          
          if (tx.reference && tx.reference_type === 'Purchase') {
            purchaseGroupMap.set(tx.reference, group);
          }
        } else {
          currentBalance -= tx.amount;
          
          if (tx.reference && tx.reference_type === 'Purchase' && purchaseGroupMap.has(tx.reference)) {
            // Merge linked payment into purchase
            const group = purchaseGroupMap.get(tx.reference)!;
            group.paid_amount = (group.paid_amount || 0) + tx.amount;
            group.net_amount = (group.purchase_amount || 0) - group.paid_amount;
            group.payment_method = tx.payment_method;
            group.notes = tx.notes || group.notes;
            
            if (group.paid_amount >= (group.purchase_amount || 0)) {
              group.type = 'paid_purchase';
            } else {
              group.type = 'partial_purchase';
            }
            
            // The running balance of the group should reflect the balance AFTER this payment is applied
            group.runningBalance = currentBalance;
          } else {
            // Independent payment
            displayGroups.push({
              id: tx.id,
              type: 'payment',
              business_date: tx.business_date || tx.date!,
              created_at: tx.created_at,
              paid_amount: tx.amount,
              net_amount: -tx.amount,
              payment_method: tx.payment_method,
              reference: tx.reference,
              reference_type: tx.reference_type,
              notes: tx.notes,
              runningBalance: currentBalance,
              originalTx: tx as VendorTransaction
            });
          }
        }
      }
      
      setTransactions(displayGroups.reverse());
      
      // Actually, I can just recalculate rawWithBalances
      let rawBalance = 0;
      const rawWith = oldestFirst.map(tx => {
        if (tx.type === 'purchase') rawBalance += tx.amount;
        else rawBalance -= tx.amount;
        return { ...tx, runningBalance: rawBalance } as VendorTransaction & { runningBalance: number };
      });
      setRawTransactions(rawWith.reverse());
    } catch (error) {
      console.error('Error loading vendor details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    
    const amountNum = parseFloat(paymentAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    if (!paymentMethod) {
      setPaymentError('Payment Method is required.');
      return;
    }
    
    if (vendor && amountNum > vendor.total_due) {
      setPaymentError('Payment cannot exceed outstanding balance.');
      return;
    }
    
    setIsRecording(true);
    try {
      if (!id) return;
      
      await transactionService.executeTransaction(
        { vendor_id: id, amount: amountNum },
        selectedDateStr,
        () => vendorService.recordPayment(
          id, 
          amountNum, 
          paymentMethod, 
          selectedDateStr, 
          '',
          paymentNotes.trim()
        ),
        ['vendors-refresh']
      );
      
      closePaymentModal();
      setPaymentAmount('');
      setPaymentNotes('');
      setSuccessMessage('Payment recorded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      window.dispatchEvent(new Event('dashboard-refresh'));
      window.dispatchEvent(new Event('storage'));
      
      loadData();
    } catch (error: unknown) {
      console.error('Error recording payment:', error);
      setPaymentError((error instanceof Error ? error.message : String(error)) || 'Failed to record payment.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleOpenEdit = (tx: VendorTransaction) => {
    if (tx.type !== 'payment') return;
    setEditingTransaction(tx);
    setEditAmount(tx.amount.toString());
    setEditNotes(tx.notes || '');
    setEditPaymentMethod((tx.payment_method as any) || 'Cash');
    setEditError(null);
    openEditModal();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editingTransaction) return;

    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditError('Amount must be greater than zero.');
      return;
    }

    if (!editPaymentMethod) {
      setEditError('Payment Method is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await transactionService.executeTransaction(
        { amount: amountNum, transaction_id: editingTransaction.id },
        (editingTransaction.business_date || editingTransaction.date || '').split('T')[0],
        () => vendorService.updateTransaction(editingTransaction.id, {
          amount: amountNum,
          notes: editNotes.trim(),
          payment_method: editPaymentMethod,
        }),
        ['vendors-refresh']
      );

      setEditingTransaction(null);
      closeEditModal();
      setSuccessMessage('Payment transaction updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);

      loadData();
    } catch (error: unknown) {
      console.error('Error updating transaction:', error);
      setEditError((error instanceof Error ? error.message : String(error)) || 'Failed to update transaction.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      await transactionService.executeTransaction(
        { action: 'delete', transaction_id: deletingTransaction.id },
        (deletingTransaction.business_date || deletingTransaction.date || '').split('T')[0],
        () => vendorService.deleteTransaction(deletingTransaction.id),
        ['vendors-refresh']
      );
      setDeletingTransaction(null);
      closeDeleting();
      setSuccessMessage('Payment deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);

      loadData();
    } catch (error: unknown) {
      console.error('Error deleting payment transaction:', error);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleOpenEditPurchase = async (referenceId: string) => {
    setIsLoading(true);
    try {
      const purchase = await stockService.getPurchase(referenceId);
      setEditingPurchase(purchase);
      openEditPurchase();
    } catch (err) {
      console.error('Error fetching purchase details:', err);
      alert('Failed to load purchase details for editing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeletePurchase = async (referenceId: string) => {
    setIsLoading(true);
    try {
      const purchase = await stockService.getPurchase(referenceId);
      setDeletingPurchaseId(referenceId);
      setDeletingPurchaseDetails(purchase);
      openDeletingPurchase();
    } catch (err) {
      console.error('Error fetching purchase details:', err);
      alert('Failed to load purchase details for deletion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!deletingPurchaseId || !deletingPurchaseDetails) return;
    setIsDeletingPurchase(true);
    try {
      // Execute transaction just wraps it to handle errors and fires `app-data-refresh` safely.
      await transactionService.executeTransaction(
        { action: 'delete_purchase', purchase_id: deletingPurchaseId },
        deletingPurchaseDetails.purchase_date.split('T')[0],
        () => stockService.deletePurchase(deletingPurchaseId)
      );
      setDeletingPurchaseId(null);
      setDeletingPurchaseDetails(null);
      closeDeletingPurchase();
      setSuccessMessage('Purchase deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      
      loadData();
    } catch (error: unknown) {
      console.error('Error deleting purchase:', error);
      alert((error instanceof Error ? error.message : String(error)) || 'Failed to delete purchase.');
    } finally {
      setIsDeletingPurchase(false);
    }
  };

  const totalPurchases = useMemo(() => {
    return rawTransactions.reduce((sum, tx) => tx.type === 'purchase' ? sum + tx.amount : sum, 0);
  }, [rawTransactions]);

  const lastPurchaseDate = useMemo(() => {
    const purchases = rawTransactions.filter(tx => tx.type === 'purchase');
    if (purchases.length === 0) return null;
    const sorted = [...purchases].sort(
      (a, b) => new Date(b.business_date || b.date!).getTime() - new Date(a.business_date || a.date!).getTime()
    );
    return sorted[0].business_date || sorted[0].date;
  }, [rawTransactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      const inv = tx.reference || purchasesMap[tx.id] || '';
      const notes = tx.notes || '';
      return inv.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
    });
  }, [transactions, searchQuery, purchasesMap]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <div className={`p-4 sm:p-6 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="vendorCredit"
        title="Vendor Ledger"
        icon={User}
        onBack={() => smartBack('/stock/vendors')}
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="TOTAL DUE" 
            amount={vendor.total_due} 
          />
          {transactions.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => vendorLedgerExportProvider.getExportData(vendor, rawTransactions, purchasesMap)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6 mt-6 relative z-20 max-w-md lg:max-w-5xl mx-auto w-full">
      <Card className={`shadow-sm ${colors.neutral.border} mb-6 overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-400" />
                {vendor.name}
              </h2>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className={`flex items-center ${colors.neutral.text} text-sm`}>
              <Phone className="w-4 h-4 mr-3 text-slate-400 shrink-0" />
              <span>{vendor.phone || <span className="text-slate-400 italic">No phone number</span>}</span>
            </div>
            <div className={`flex items-start ${colors.neutral.text} text-sm`}>
              <MapPin className="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" />
              <span>{vendor.address || <span className="text-slate-400 italic">No address</span>}</span>
            </div>
          </div>

          {/* Header Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-red-800 text-xs font-semibold uppercase tracking-wider mb-1">
                Outstanding Balance
              </p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(vendor.total_due)}
              </p>
            </div>
            <div className={`${colors.neutral.bg} rounded-xl p-4 border border-slate-100`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Last Purchase Date
              </p>
              <p className="text-sm font-bold text-slate-800">
                {lastPurchaseDate ? format(new Date(lastPurchaseDate), 'dd MMM yyyy') : '—'}
              </p>
            </div>
            <div className={`${colors.neutral.bg} rounded-xl p-4 border border-slate-100`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Total Purchases
              </p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(totalPurchases)}
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div>
            <Button 
              className={cn("w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 rounded-xl text-base shadow-sm", !isOwner() && "opacity-50 cursor-not-allowed")}
              onClick={(e) => { if (requirePermission(e)) openPaymentModal(); }}
              disabled={vendor.total_due <= 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Pay Vendor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger History & Search */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Ledger History</h3>
        <div className="relative w-full sm:w-64">
          <Input 
            type="text"
            placeholder="Search invoice or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`bg-white ${colors.neutral.border} text-xs pl-3 pr-8`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={`absolute right-2 top-2.5 text-slate-400 hover:${colors.neutral.text}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className={`bg-white rounded-xl p-8 text-center border ${colors.neutral.border} shadow-sm mb-20`}>
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No transactions found.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-24">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id} className={`shadow-sm ${colors.neutral.border} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${tx.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {tx.type === 'payment' ? <CheckCircle2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 capitalize text-sm">
                        {tx.type === 'payment' ? 'Payment' : 'Purchase'}
                        {tx.type === 'payment' && tx.payment_method && (
                          <span className="ml-2 text-xs font-normal text-slate-500">({tx.payment_method})</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatBusinessDate(tx.business_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`font-bold ${tx.type === 'payment' ? 'text-green-600' : 'text-orange-600'}`}>
                      {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.type === 'payment' ? tx.paid_amount! : tx.purchase_amount!)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      Vendor balance after transaction: {formatCurrency(tx.runningBalance)}
                    </p>
                    {/* Action buttons */}
                    {tx.type === 'payment' ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => { if (requirePermission(e)) handleOpenEdit(tx.originalTx); }}
                          className={cn("inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </button>
                        <button
                          onClick={(e) => { 
                            if (requirePermission(e)) {
                              setDeletingTransaction(tx.originalTx);
                              openDeleting();
                            }
                          }}
                          className={cn("inline-flex items-center text-xs text-red-600 hover:text-red-800 font-medium transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
                        >
                          <X className="w-3 h-3 mr-1" /> Delete
                        </button>
                      </div>
                    ) : (
                      tx.reference && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={(e) => { if (requirePermission(e)) handleOpenEditPurchase(tx.reference!); }}
                            className={cn("inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
                          >
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </button>
                          <button
                            onClick={(e) => { 
                              if (requirePermission(e)) {
                                handleOpenDeletePurchase(tx.reference!);
                              }
                            }}
                            className={cn("inline-flex items-center text-xs text-red-600 hover:text-red-800 font-medium transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
                          >
                            <X className="w-3 h-3 mr-1" /> Delete
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {tx.type !== 'payment' && (
                  <div className="mt-1 mb-2 ml-11">
                    {tx.type === 'paid_purchase' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 tracking-wide uppercase">PAID • {tx.payment_method}</span>}
                    {tx.type === 'partial_purchase' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 tracking-wide uppercase">PARTIAL • {tx.payment_method}</span>}
                    {tx.type === 'purchase' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 tracking-wide uppercase">CREDIT</span>}
                  </div>
                )}

                {(tx.type === 'paid_purchase' || tx.type === 'partial_purchase') && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 ml-11 mr-2">
                     <div className="flex justify-between">
                       <span className="text-slate-500">Purchase amount</span>
                       <span className="font-medium">{formatCurrency(tx.purchase_amount!)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-500">Paid</span>
                       <span className="font-medium text-green-600">{formatCurrency(tx.paid_amount!)}</span>
                     </div>
                     <div className="flex justify-between font-medium pt-1 border-t border-slate-50">
                       <span className="text-slate-500">{tx.type === 'paid_purchase' ? 'Due impact' : 'Remaining'}</span>
                       <span>{formatCurrency(tx.net_amount)}</span>
                     </div>
                  </div>
                )}
                
                {(tx.reference || tx.notes) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {tx.reference && (
                      <p className={`text-xs ${colors.neutral.text} flex items-center`}>
                        <Tag className="w-3 h-3 mr-1.5 text-slate-400" />
                        <span className="font-medium mr-1">Invoice / Ref:</span> {tx.reference}
                      </p>
                    )}
                    {tx.notes && (
                      <p className={`text-xs ${colors.neutral.text} flex items-start`}>
                        <FileText className="w-3 h-3 mr-1.5 mt-0.5 text-slate-400 shrink-0" />
                        <span className="font-medium mr-1">Notes:</span> {tx.notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closePaymentModal}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Pay Vendor</h2>
              <button 
                onClick={closePaymentModal}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {paymentError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {paymentError}
                </div>
              )}
              
              <div className={`${colors.neutral.bg} p-4 rounded-xl border border-slate-100 mb-2`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${colors.neutral.text}`}>Outstanding Balance</span>
                  <span className="text-base font-bold text-slate-900">{formatCurrency(vendor.total_due)}</span>
                </div>
              </div>

              <TransactionDatePicker
                value={selectedDateStr}
                onChange={(d) => setSelectedDate(new Date(d))}
                label="Date"
              />
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700">Payment Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input 
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={vendor.total_due}
                    autoFocus
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-12 pr-4 font-semibold text-lg"
                  />
                </div>
              </div>
              




              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm font-medium text-slate-700">Payment Method <span className="text-red-500">*</span></Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'UPI' | 'Bank')}
                  className={`w-full text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2`}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="notes"
                    placeholder="Add notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className={`w-full min-h-[80px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 resize-none`}
                  />
                </div>
              </div>

              </div>

              <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col md:flex-row gap-3 shrink-0`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  className={`w-full md:flex-1 bg-white hover:${colors.neutral.bg}`}
                  onClick={closePaymentModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full md:flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                  disabled={isRecording || !paymentAmount}
                >
                  {isRecording ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording...</>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeEditModal}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Edit Payment</h2>
              <button 
                onClick={closeEditModal}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {editError}
                </div>
              )}
              {/* Edit Amount */}
              <div className="space-y-2">
                <Label htmlFor="editAmount" className="text-sm font-medium text-slate-700">Payment Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input 
                    id="editAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    placeholder="Enter amount"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-12 pr-4 font-semibold text-lg"
                  />
                </div>
              </div>

              {/* Editable Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="editPaymentMethod" className="text-sm font-medium text-slate-700">Payment Method <span className="text-red-500">*</span></Label>
                <select
                  id="editPaymentMethod"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as 'Cash' | 'UPI' | 'Bank')}
                  className={`w-full text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2`}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              
              {/* Editable Notes */}
              <div className="space-y-2">
                <Label htmlFor="editNotes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="editNotes"
                    placeholder="Add notes..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className={`w-full min-h-[80px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none`}
                  />
                </div>
              </div>
              
              </div>

              <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col md:flex-row gap-3 shrink-0`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  className={`w-full md:flex-1 bg-white hover:${colors.neutral.bg}`}
                  onClick={closeEditModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  disabled={isSavingEdit || !editAmount}
                >
                  {isSavingEdit ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Modal */}
      {isDeletingOpen && deletingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDeleting}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Delete Payment</h2>
              <button 
                onClick={closeDeleting}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <p className={`${colors.neutral.text} text-sm`}>
                Are you sure you want to delete this payment of <strong>{formatCurrency(deletingTransaction.amount)}</strong>? This will increase vendor outstanding and update balance records.
              </p>
              
              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full md:flex-1"
                  onClick={closeDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  className="w-full md:flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeletePayment}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                  ) : (
                    'Delete Payment'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Purchase Modal */}
      {isEditPurchaseOpen && (
        <AddPurchaseModal 
          isOpen={isEditPurchaseOpen} 
          onClose={closeEditPurchase} 
          onSuccess={() => {
            setSuccessMessage('Purchase updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
            loadData();
          }} 
          initialPurchase={editingPurchase} 
        />
      )}

      {/* Delete Purchase Modal */}
      {isDeletingPurchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDeletingPurchase}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Delete Purchase {deletingPurchaseDetails?.purchase_amount ? `₹${deletingPurchaseDetails.purchase_amount}` : ''}?</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                This will remove this purchase and any payment recorded against this purchase from the vendor ledger.
              </p>
              <p className="text-red-600 text-sm font-semibold">
                This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full md:flex-1"
                  onClick={closeDeletingPurchase}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  className="w-full md:flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeletePurchase}
                  disabled={isDeletingPurchase}
                >
                  {isDeletingPurchase ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                  ) : (
                    'Delete Purchase'
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
