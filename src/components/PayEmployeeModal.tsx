import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, CreditCard, User, Hash, FileText, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { Employee } from '../services/employee.service';
import { payrollService, PaymentType, PaymentMethod } from '../services/payroll.service';
import { transactionService } from '../services/transaction.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionDatePicker } from './TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface PayEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee | null;
  pendingSalary: number;
}

const PAYMENT_TYPES: PaymentType[] = ['Salary Advance', 'Salary Settlement', 'Bonus', 'Reimbursement'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank'];

export function PayEmployeeModal({ isOpen, onClose, onSuccess, employee, pendingSalary }: PayEmployeeModalProps) {
  const [paymentType, setPaymentType] = useState<PaymentType | ''>('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const globalDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [paymentDate, setPaymentDate] = useState(globalDateStr);
  
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  const resetForm = () => {
    setPaymentType('');
    setAmount('');
    setPaymentMethod('Cash');
    setPaymentDate(globalDateStr);
    setReferenceNumber('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!paymentType) {
      setError('Payment Type is required');
      return;
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    
    // Rule: Salary Settlement cannot exceed Pending Salary
    if (paymentType === 'Salary Settlement' && numAmount > pendingSalary) {
      setError(`Settlement amount (₹${numAmount}) cannot exceed Pending Salary (₹${pendingSalary})`);
      return;
    }

    if (!paymentMethod) {
      setError('Payment Method is required');
      return;
    }
    if (!paymentDate) {
      setError('Payment Date is required');
      return;
    }

    setIsSaving(true);
    try {
      await transactionService.executeTransaction(
        { employee_id: employee.id, amount: numAmount },
        paymentDate,
        () => payrollService.payEmployee({
          employee_id: employee.id,
          payment_type: paymentType as PaymentType,
          amount: numAmount,
          payment_method: paymentMethod as PaymentMethod,
          payment_date: paymentDate,
          reference_number: referenceNumber.trim(),
          notes: notes.trim(),
        }),
        ['salary-refresh']
      );
      onSuccess();
    } catch (err: unknown) {
      console.error('Error recording payment:', err);
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to record payment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[min(88vh,640px)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">💰 Pay Employee</h2>
              <p className="text-xs text-slate-500">Record an employee payment.</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className={`text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 p-2 rounded-full transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className={`overflow-y-auto p-4 sm:p-6 space-y-4 ${colors.neutral.bg}/50`}>
          {error && (
            <div className={`${moduleTheme.salary.bgLight} text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Pending Salary</p>
              <p className="text-lg font-black text-blue-800">₹{pendingSalary.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border ${colors.neutral.border} shadow-sm`}>
            <div>
              <Label className="text-xs text-slate-500">Employee Name</Label>
              <p className="font-bold text-slate-800">{employee.name}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Employee ID</Label>
              <p className={`font-medium ${colors.neutral.text}`}>{employee.employee_id}</p>
            </div>
          </div>

          <div className={`space-y-4 bg-white p-4 rounded-xl border ${colors.neutral.border} shadow-sm`}>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Payment Type <span className={`${moduleTheme.salary.textLight}`}>*</span></Label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className={`w-full h-11 px-3 rounded-xl border ${colors.neutral.border} ${colors.neutral.bg} text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
              >
                <option value="">Select type...</option>
                {PAYMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Amount <span className={`${moduleTheme.salary.textLight}`}>*</span></Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`pl-7 h-11 ${colors.neutral.bg} ${colors.neutral.border} focus:bg-white rounded-xl`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Payment Method <span className={`${moduleTheme.salary.textLight}`}>*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                      paymentMethod === method
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <TransactionDatePicker
              label="Payment Date"
              value={paymentDate}
              onChange={setPaymentDate}
            />
          </div>

          <div className={`space-y-4 bg-white p-4 rounded-xl border ${colors.neutral.border} shadow-sm`}>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-slate-400" />
                Reference Number <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID, Cheque No..."
                className={`h-11 ${colors.neutral.bg} ${colors.neutral.border} focus:bg-white rounded-xl`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className={`h-11 ${colors.neutral.bg} ${colors.neutral.border} focus:bg-white rounded-xl`}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className={`flex-1 h-12 rounded-xl ${colors.neutral.border} hover:${colors.neutral.bg} font-bold`}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Pay Employee'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
