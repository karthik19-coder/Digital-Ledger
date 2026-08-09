import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, Search, Loader2, X, Banknote, Edit2, Trash2, Calendar,
  Download, Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { payrollService, EmployeeLedger as LedgerType, PayrollPayment } from '../services/payroll.service';
import { EditPaymentModal } from '../components/EditPaymentModal';
import { ViewPaymentModal } from '../components/ViewPaymentModal';
import { usePermissions } from '../hooks/usePermissions';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { cn } from '../lib/utils';


export default function EmployeeLedger() {
  const { id } = useParams();
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  
  const [ledger, setLedger] = useState<LedgerType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { isOpen: isViewOpen, openModal: openView, closeModal: closeView } = useModalNavigation('ledger-view-payment');
  const [viewingPayment, setViewingPayment] = useState<PayrollPayment | null>(null);
  const { isOpen: isEditOpen, openModal: openEdit, closeModal: closeEdit } = useModalNavigation('ledger-edit-payment');
  const [editingPayment, setEditingPayment] = useState<PayrollPayment | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await payrollService.getEmployeeLedger(id);
      setLedger(data);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();

    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      };
  }, [loadData]);

  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletePaymentId) {
      await payrollService.deletePayment(deletePaymentId);
      setDeletePaymentId(null);
      loadData();
    }
  };


  const filteredHistory = useMemo(() => {
    if (!ledger) return [];
    
    return ledger.history.filter(payment => {
      // Filter by type or method
      if (statusFilter !== 'All') {
        if (statusFilter.startsWith('Paid via ')) {
          const method = statusFilter.replace('Paid via ', '');
          if (payment.payment_method !== method) return false;
        } else {
          if (payment.payment_type !== statusFilter) return false;
        }
      }
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          payment.reference_number?.toLowerCase().includes(query) ||
          payment.notes?.toLowerCase().includes(query) ||
          payment.payment_method.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [ledger, statusFilter, searchQuery]);

  if (isLoading && !ledger) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading ledger...</p>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="p-6 text-center">
        <p className={`${moduleTheme.salary.textLight}`}>Employee not found.</p>
        <button onClick={() => smartBack(`/expenses/employees/${id}`)} className="mt-4 text-blue-600 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className={`${colors.neutral.bg} min-h-screen pb-24 safe-page-pb`}>
      {/* Header */}
      <div className={`bg-white pt-4 px-4 sm:px-6 pb-4 border-b ${colors.neutral.border} sticky top-0 z-30`}>
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => smartBack(`/expenses/employees/${id}`)}
            className={`w-10 h-10 flex items-center justify-center rounded-full bg-white border ${colors.neutral.border} ${colors.neutral.text} hover:${colors.neutral.bg} shadow-sm shrink-0`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-6 h-6 text-purple-600" />
              Employee Ledger
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              {ledger.employee.name} • {ledger.employee.employee_id}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Coming Soon</span>
            <button 
              disabled
              className={`flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-slate-100 text-slate-400 font-bold border ${colors.neutral.border} cursor-not-allowed`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Ledger</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0">
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 sm:p-3 shadow-sm flex flex-col justify-center text-center min-w-0`}>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Calculated</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 truncate">{formatCurrency(ledger.total_calculated_salary)}</span>
          </div>
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 sm:p-3 shadow-sm flex flex-col justify-center text-center min-w-0`}>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Paid</span>
            <span className="text-lg sm:text-xl font-black text-green-600 truncate">{formatCurrency(ledger.total_paid)}</span>
          </div>
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 sm:p-3 shadow-sm flex flex-col justify-center text-center min-w-0`}>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Pending</span>
            <span className={`text-lg sm:text-xl font-black ${moduleTheme.salary.text} truncate`}>{formatCurrency(ledger.pending_salary)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4">
        {/* Search and Filters */}
        <div className="mb-4">
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <Input
              type="text"
              placeholder="Search reference, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 h-11 bg-white ${colors.neutral.border} shadow-sm rounded-xl`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:${colors.neutral.text}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {['All', 'Salary Advance', 'Salary Settlement', 'Bonus', 'Reimbursement', 'Paid via Cash', 'Paid via UPI', 'Paid via Bank'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 snap-start border transition-colors ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* History List (Timeline) */}
        <div className="mt-6 relative">
          <div className="absolute top-0 bottom-0 left-[27px] sm:left-[35px] w-px bg-slate-200"></div>

          {filteredHistory.length === 0 ? (
            <div className={`text-center py-12 bg-white rounded-xl border ${colors.neutral.border} shadow-sm relative z-10 ml-[45px] sm:ml-[60px]`}>
              <p className="text-slate-500 font-medium">No payments found.</p>
            </div>
          ) : (
            filteredHistory.map((payment, index) => {
              // Calculate running balance (naive approach working backward from current pending)
              // Total Pending = (Total Calculated) - (Total Deductible Payments)
              // For the UI, we'll just display a dynamic string for now.
              let badgeColor = 'bg-slate-100 text-slate-700';
              let iconColor = 'text-slate-500';
              let ringColor = 'border-slate-200';
              
              if (payment.payment_type === 'Salary Settlement') {
                badgeColor = 'bg-green-100 text-green-700'; iconColor = 'text-green-600'; ringColor = 'border-green-200';
              } else if (payment.payment_type === 'Salary Advance') {
                badgeColor = 'bg-orange-100 text-orange-700'; iconColor = 'text-orange-600'; ringColor = 'border-orange-200';
              } else if (payment.payment_type === 'Bonus') {
                badgeColor = 'bg-purple-100 text-purple-700'; iconColor = 'text-purple-600'; ringColor = 'border-purple-200';
              } else if (payment.payment_type === 'Reimbursement') {
                badgeColor = 'bg-blue-100 text-blue-700'; iconColor = 'text-blue-600'; ringColor = 'border-blue-200';
              }

              // Calculating running balance:
              // Assuming filteredHistory is sorted NEWEST FIRST.
              // To get the exact running balance *after* this payment, we'd need to simulate all transactions chronologically.
              // We will just show "Pending" as the total pending to avoid complexity in this MVP.
              const isFirst = index === 0;

              return (
                <div key={payment.id} className="relative mb-6">
                  {/* Timeline Node */}
                  <div className={`absolute left-[16px] sm:left-[24px] w-6 h-6 sm:w-6 sm:h-6 rounded-full bg-white border-4 ${ringColor} z-10 top-4`}></div>
                  
                  <div className={`ml-[48px] sm:ml-[64px] bg-white rounded-xl overflow-hidden border ${colors.neutral.border} shadow-sm relative z-10`}>
                    <div className="absolute top-4 right-4">
                       <span className={`${badgeColor} text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider`}>
                        {payment.payment_type}
                      </span>
                    </div>

                    <div className="p-4 border-b border-slate-100">
                      <div className="flex gap-2 items-center mb-1">
                        <Calendar className={`w-4 h-4 ${iconColor}`} />
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base pr-24">
                          {format(parseISO(payment.payment_date), 'dd MMM yyyy')}
                        </h3>
                      </div>
                      <p className="text-xs font-medium text-slate-500">{payment.payment_method} {payment.reference_number ? `• Ref: ${payment.reference_number}` : ''}</p>
                    </div>

                    <div className={`px-4 py-3 ${colors.neutral.bg} border-b border-slate-100`}>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</p>
                          <span className={`text-xl font-black ${iconColor}`}>{formatCurrency(payment.amount)}</span>
                        </div>
                        {isFirst && statusFilter === 'All' && !searchQuery && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Running Balance</p>
                            <span className="text-sm font-bold text-slate-700">{formatCurrency(ledger.pending_salary)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex p-2 bg-white gap-2">
                      <button 
                        onClick={() => {
                          setViewingPayment(payment);
                          openView();
                        }}
                        className={`flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-bold ${colors.neutral.text} hover:${colors.neutral.bg} rounded-lg transition-colors border border-transparent hover:${colors.neutral.border}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button 
                        onClick={(e) => { 
                          if (requirePermission(e)) {
                            setEditingPayment(payment);
                            openEdit();
                          }
                        }}
                        className={cn("flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100", !isOwner() && "opacity-50 cursor-not-allowed")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button 
                        onClick={(e) => { if (requirePermission(e)) setDeletePaymentId(payment.id); }}
                        className={cn(`flex-1 flex justify-center items-center gap-1.5 py-2 text-xs font-bold ${moduleTheme.salary.text} hover:${moduleTheme.salary.bgLight} rounded-lg transition-colors border border-transparent hover:border-red-100`, !isOwner() && "opacity-50 cursor-not-allowed")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ViewPaymentModal
        isOpen={isViewOpen && !!viewingPayment}
        onClose={() => {
          setViewingPayment(null);
          closeView();
        }}
        payment={viewingPayment ? { ...viewingPayment, employee: ledger.employee } : null}
      />

      <EditPaymentModal
        isOpen={isEditOpen && !!editingPayment}
        onClose={() => {
          setEditingPayment(null);
          closeEdit();
        }}
        payment={editingPayment}
        onSuccess={() => {
          setEditingPayment(null);
          closeEdit();
          loadData();
        }}
      />
      <ConfirmDialog
        isOpen={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        title="Delete Payment?"
        description="Are you sure you want to delete this payment? This will also reverse the expense and update pending salary."
        confirmText="Delete Payment"
        destructive={true}
        onConfirm={handleDelete}
      />
    </div>
  );
}
