import { X, User, Calendar, FileText, Hash, Banknote, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PayrollPaymentWithEmployee } from '../services/payroll.service';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface ViewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PayrollPaymentWithEmployee | null;
}

export function ViewPaymentModal({ isOpen, onClose, payment }: ViewPaymentModalProps) {
  if (!isOpen || !payment) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payment Details</h2>
              <p className="text-xs text-slate-500">View payment information.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 p-2 rounded-full transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={`overflow-y-auto p-4 sm:p-6 space-y-4 ${colors.neutral.bg}/50`}>
          <div className={`bg-white p-4 rounded-xl border ${colors.neutral.border} shadow-sm flex items-center gap-3`}>
            <div className={`w-12 h-12 rounded-full bg-slate-100 ${colors.neutral.text} font-bold flex items-center justify-center shrink-0 border ${colors.neutral.border}`}>
              👤
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{payment.employee.name}</h3>
              <p className="text-xs text-slate-500">{payment.employee.employee_id}</p>
            </div>
          </div>

          <div className={`bg-white p-4 rounded-xl border ${colors.neutral.border} shadow-sm space-y-4`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Type</span>
                <p className="font-bold text-slate-900">{payment.payment_type}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</span>
                <p className="text-lg font-black text-blue-600">{formatCurrency(payment.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Banknote className="w-3 h-3" /> Method</span>
                <p className="font-medium text-slate-800">{payment.payment_method}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</span>
                <p className="font-medium text-slate-800">{format(parseISO(payment.payment_date), 'dd MMM yyyy')}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Reference Number</span>
                <p className="font-medium text-slate-800">{payment.reference_number || 'N/A'}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</span>
                <p className={`font-medium text-slate-800 ${colors.neutral.bg} p-2 rounded-lg text-sm border border-slate-100`}>{payment.notes || 'No notes provided'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            Created on {format(parseISO(payment.created_at), 'dd MMM yyyy, hh:mm a')}
          </div>
        </div>

      </div>
    </div>
  );
}
