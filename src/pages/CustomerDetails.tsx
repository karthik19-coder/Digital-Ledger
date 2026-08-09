import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, MapPin, Loader2, X, AlertCircle, 
  CheckCircle2, CreditCard, Calendar, FileText, Plus, Tag, Edit, Clock, Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { customerService, Customer, CustomerTransaction } from '../services/customer.service';
import { dashboardService } from '../services/dashboard.service';
import { calculateCustomerDueSince } from '../utils/dueSince';
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
  EmptyState,
  FinancialCard,
  PrimaryActionButton,
  ExportButton
} from '../components/shared';
import { moduleTheme, colors, spacing, radius, shadow, typography, animations } from '../theme';
import { customerLedgerExportProvider } from '../services/export/providers/customerLedgerExportProvider';


import { useQueryCache } from '../hooks/useQueryCache';
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

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const { smartBack } = useSmartBack();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, requirePermission } = usePermissions();
  
  const fetchCustomerData = async () => {
    if (!id) throw new Error('No customer ID provided');
    const [cust, txs] = await Promise.all([
      customerService.getCustomer(id),
      customerService.getCustomerTransactions(id)
    ]);
    if (!cust) throw new Error('Customer not found');
    
    const oldestFirst = [...txs].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : new Date(a.date || a.business_date).getTime();
      const bDate = b.created_at ? new Date(b.created_at).getTime() : new Date(b.date || b.business_date).getTime();
      return aDate - bDate;
    });
    let currentBalance = 0;
    const withBalances = oldestFirst.map(tx => {
      if (tx.type === 'credit') {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      return {
        ...tx,
        balance_after: currentBalance
      };
    });
    // Sort back to newest first for display
    const transactions = withBalances.reverse();
    
    return { customer: cust, transactions };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadData } = useQueryCache(
    `customer-details-${id}`,
    fetchCustomerData,
    [id]
  );

  const customer = cachedRes?.customer || null;
  const transactions = cachedRes?.transactions || [];
  
  const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = useModalNavigation('customer-payment');
  const { isOpen: isCreditModalOpen, openModal: openCreditModal, closeModal: closeCreditModal } = useModalNavigation('customer-add-credit');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [creditError, setCreditError] = useState<string | null>(null);
  const [isAddingCredit, setIsAddingCredit] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Transaction modal state
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModalNavigation('customer-edit-tx');
  const [editingTransaction, setEditingTransaction] = useState<CustomerTransaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Transaction modal state
  const { isOpen: isDeletingOpen, openModal: openDeletingModal, closeModal: closeDeletingModal } = useModalNavigation('customer-delete-tx');
  const [deletingTransaction, setDeletingTransaction] = useState<CustomerTransaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dueSinceInfo = useMemo(() => {
    if (!customer || customer.total_credit <= 0) return null;
    return calculateCustomerDueSince(transactions, customer.total_credit);
  }, [customer, transactions]);

  useEffect(() => {
    if (location.state?.openAddCredit) {
      const state = { ...location.state };
      delete state.openAddCredit;
      navigate(location.pathname, { replace: true, state });
      setTimeout(() => openCreditModal(), 0);
    }
  }, [location.state, navigate, location.pathname, openCreditModal]);

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreditError(null);
    
    const amountNum = parseFloat(creditAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setCreditError('Credit amount must be greater than zero.');
      return;
    }
    
    setIsAddingCredit(true);
    try {
      if (!id) return;
      
      await customerService.addCredit(
        id, 
        amountNum, 
        selectedDateStr,
        '', 
        creditNotes.trim()
      );
      
      closeCreditModal();
      setCreditAmount('');
      setCreditNotes('');
      setSuccessMessage('Credit added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      window.dispatchEvent(new Event('dashboard-refresh'));
      
      loadData();
    } catch (error: unknown) {
      console.error('Error adding credit:', error);
      setCreditError((error instanceof Error ? error.message : String(error)) || 'Failed to add credit.');
    } finally {
      setIsAddingCredit(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    
    const amountNum = parseFloat(paymentAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Payment must be greater than zero.');
      return;
    }

    if (!paymentMethod) {
      setPaymentError('Payment Method is required.');
      return;
    }
    
    if (customer && amountNum > customer.total_credit) {
      setPaymentError('Payment cannot exceed outstanding balance.');
      return;
    }
    
    setIsRecording(true);
    try {
      if (!id) return;
      
      await transactionService.executeTransaction(
        { customer_id: id, amount: amountNum },
        selectedDateStr,
        () => customerService.recordPayment(
          id, 
          amountNum, 
          paymentMethod, 
          selectedDateStr, 
          '', 
          paymentNotes.trim()
        ),
        ['customer-refresh']
      );
      
      closePaymentModal();
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentNotes('');
      setSuccessMessage('Payment recorded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      
      loadData();
    } catch (error: unknown) {
      console.error('Error recording payment:', error);
      setPaymentError((error instanceof Error ? error.message : String(error)) || 'Failed to record payment.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleOpenEdit = (tx: CustomerTransaction) => {
    setEditingTransaction(tx);
    setEditAmount(tx.amount.toString());
    setEditNotes(tx.notes || '');
    setEditPaymentMethod(tx.payment_method || 'Cash');
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

    if (editingTransaction.type === 'payment' && !editPaymentMethod) {
      setEditError('Payment Method is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await transactionService.executeTransaction(
        { amount: amountNum, transaction_id: editingTransaction.id },
        editingTransaction.date.split('T')[0],
        () => customerService.updateTransaction(editingTransaction.id, {
          amount: amountNum,
          notes: editNotes.trim(),
          payment_method: editingTransaction.type === 'payment' ? editPaymentMethod : undefined,
        }),
        ['customer-refresh']
      );

      closeEditModal();
      setEditingTransaction(null);
      setSuccessMessage('Transaction updated successfully');
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

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await transactionService.executeTransaction(
        { amount: -deletingTransaction.amount, transaction_id: deletingTransaction.id },
        deletingTransaction.date?.split('T')[0] || deletingTransaction.business_date,
        () => customerService.deleteTransaction(deletingTransaction.id),
        ['customer-refresh']
      );

      closeDeletingModal();
      setDeletingTransaction(null);
      setSuccessMessage('Transaction deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      
      loadData();
    } catch (error: unknown) {
      console.error('Error deleting transaction:', error);
      setDeleteError((error instanceof Error ? error.message : String(error)) || 'Failed to delete transaction.');
    } finally {
      setIsDeleting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className={`flex flex-col flex-1 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="customerCredit"
        title="Customer Profile"
        icon={User}
        onBack={() => smartBack('/credit')}
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="OUTSTANDING BALANCE" 
            amount={customer.total_credit} 
          />
          {transactions.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => customerLedgerExportProvider.getExportData(customer, transactions)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 space-y-6 mt-6 relative z-20">
        {/* Customer Information Card */}
        <Card className={`shadow-sm ${colors.neutral.border} overflow-hidden bg-white`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full ${moduleTheme.customerCredit.bgLight} flex items-center justify-center shrink-0`}>
                <User className={`w-5 h-5 ${moduleTheme.customerCredit.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 uppercase truncate">
                  {customer.name}
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Customer Profile
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors.neutral.bg} flex items-center justify-center shrink-0`}>
                  <Phone className={`w-4 h-4 ${colors.neutral.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Phone</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{customer.phone || "No phone number"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors.neutral.bg} flex items-center justify-center shrink-0`}>
                  <MapPin className={`w-4 h-4 ${colors.neutral.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Address</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{customer.address || "No address"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors.neutral.bg} flex items-center justify-center shrink-0`}>
                  <Calendar className={`w-4 h-4 ${colors.neutral.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Created Date</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{customer.created_at ? format(parseISO(customer.created_at), 'dd MMM yyyy') : "Unknown"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <PrimaryActionButton
            icon={Plus}
            onClick={(e) => { if (requirePermission(e)) openCreditModal(); }}
            theme="customerCredit"
            className={cn("h-12 text-sm sm:text-base rounded-xl", !isOwner() && "opacity-50 cursor-not-allowed")}
          >
            Add Credit
          </PrimaryActionButton>
          <PrimaryActionButton
            icon={CreditCard}
            onClick={(e) => { if (requirePermission(e)) openPaymentModal(); }}
            theme="sales"
            disabled={customer.total_credit <= 0}
            className={cn("h-12 text-sm sm:text-base rounded-xl", !isOwner() && "opacity-50 cursor-not-allowed")}
          >
            Receive Payment
          </PrimaryActionButton>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Transaction History</h3>

          {transactions.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No transactions yet"
              subtitle="Credit and payments will appear here."
            />
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <FinancialCard
                  key={tx.id}
                  title={tx.type === 'credit' ? 'Credit Added' : 'Payment Received'}
                  subtitle={formatBusinessDate(tx.business_date || tx.date)}
                  amount={tx.amount}
                  amountColor={tx.type === 'credit' ? "text-orange-600" : "text-green-600"}
                  icon={tx.type === 'credit' ? CreditCard : CheckCircle2}
                  theme={tx.type === 'credit' ? 'customerCredit' : 'sales'}
                  onEdit={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(tx);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeletingTransaction(tx);
                    setDeleteError(null);
                    openDeletingModal();
                  }}
                  badge={
                    tx.payment_method ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {tx.payment_method}
                      </span>
                    ) : undefined
                  }
                >
                  {tx.notes && (
                    <p className={`text-sm ${colors.neutral.text} bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2 mx-5 mt-2 line-clamp-2`}>
                      {tx.notes}
                    </p>
                  )}
                  <div className="flex justify-between items-center px-5 pt-3 pb-3 border-t border-slate-100 mt-2">
                    <span className="text-xs font-medium text-slate-400">Balance after tx: <span className="text-slate-700 font-bold ml-1">{formatCurrency((tx as any).runningBalance)}</span></span>
                  </div>
                </FinancialCard>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Credit Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeCreditModal}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-600" />
                Add Credit
              </h2>
              <button 
                onClick={closeCreditModal}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCredit} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {creditError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {creditError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="creditAmount" className="text-sm font-medium text-slate-700">Credit Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input className="w-full pl-12 pr-4 text-lg font-semibold"  
                    id="creditAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    placeholder="Enter amount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>
              </div>
              
              <TransactionDatePicker
                value={selectedDateStr}
                onChange={(d) => setSelectedDate(new Date(d))}
                label="Credit Date"
              />
              
              <div className="space-y-2">
                <Label htmlFor="creditNotes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="creditNotes"
                    placeholder="Add credit notes..."
                    value={creditNotes}
                    onChange={(e) => setCreditNotes(e.target.value)}
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
                  onClick={closeCreditModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full md:flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm"
                  disabled={isRecording || !creditAmount}
                >
                  {isRecording ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Add Credit'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-700" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
              </div>
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

              <div className={`${colors.neutral.bg} p-4 rounded-xl border border-slate-100 flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Due</p>
                  <p className="text-xs text-slate-400 mt-0.5">{customer.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">{formatCurrency(customer.total_credit)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700">Payment Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input className="w-full pl-12 pr-4 text-lg font-semibold"  
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={customer.total_credit}
                    autoFocus
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>

              <TransactionDatePicker
                value={selectedDateStr}
                onChange={(d) => setSelectedDate(new Date(d))}
                label="Payment Date"
              />

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
                <Label htmlFor="paymentNotes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="paymentNotes"
                    placeholder="Add payment notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
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
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeEditModal}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-slate-600" />
                Edit Transaction
              </h2>
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

              {/* Read-Only Info */}
              <div className={`${colors.neutral.bg} p-4 rounded-xl border border-slate-100 space-y-2 text-sm ${colors.neutral.text}`}>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Transaction ID</span>
                  <span className="font-mono text-slate-900">{editingTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Type</span>
                  <span className="font-semibold capitalize text-slate-900">{editingTransaction.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Customer</span>
                  <span className="font-semibold text-slate-900">{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Business Date</span>
                  <span className="text-slate-900">{formatBusinessDate(editingTransaction.business_date || editingTransaction.date)}</span>
                </div>
              </div>
              
              {/* Editable Amount */}
              <div className="space-y-2">
                <Label htmlFor="editAmount" className="text-sm font-medium text-slate-700">Amount <span className="text-red-500">*</span></Label>
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

              {/* Editable Payment Method (Only if Payment) */}
              {editingTransaction.type === 'payment' && (
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
              )}
              
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

              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full md:flex-1"
                  onClick={() => setEditingTransaction(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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

      {/* Delete Transaction Modal */}
      {isDeletingOpen && deletingTransaction && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
          <div className="w-full sm:max-w-md bg-white sm:rounded-2xl shadow-2xl overflow-hidden rounded-t-[1.5rem]">
            <div className="p-4 sm:p-5 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Transaction
              </h2>
              <button 
                onClick={() => {
                  closeDeletingModal();
                  setDeletingTransaction(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 pb-8 sm:pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {deleteError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{deleteError}</p>
                </div>
              )}
              
              <div className="text-center py-4 space-y-2">
                <p className="text-slate-600 text-base">
                  Are you sure you want to delete this {deletingTransaction.type === 'credit' ? 'credit' : 'payment'}?
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(deletingTransaction.amount)}
                </p>
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full md:flex-1"
                  onClick={() => {
                    closeDeletingModal();
                    setDeletingTransaction(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleDeleteTransaction}
                  className="w-full md:flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                  ) : (
                    'Delete Transaction'
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
