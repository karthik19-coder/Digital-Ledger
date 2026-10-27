import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Calendar, IndianRupee, CreditCard, Banknote, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { payrollService } from '../services/payroll.service';
import { transactionService } from '../services/transaction.service';
import { Employee } from '../services/employee.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionDatePicker } from './TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface PaySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee | null;
  pendingSalary: number;
}

export function PaySalaryModal({ isOpen, onClose, onSuccess, employee, pendingSalary }: PaySalaryModalProps) {
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const globalDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [paymentDate, setPaymentDate] = useState(globalDateStr);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');
  const [allowAdvance, setAllowAdvance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(globalDateStr);
      setAmount('');
      setPaymentMethod('Cash');
      setNotes('');
      setAllowAdvance(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > pendingSalary && !allowAdvance) {
      setError('Amount exceeds pending salary.');
      return;
    }

    setIsSaving(true);
    try {
      await transactionService.executeTransaction(
        { employee_id: employee.id, amount: numAmount },
        paymentDate,
        () => payrollService.payEmployee({
          employee_id: employee.id,
          amount: numAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_type: numAmount > pendingSalary && pendingSalary === 0 ? 'Salary Advance' : 'Salary Settlement',
          notes: notes.trim() || undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pay Salary</h2>
            <p className="text-xs text-slate-500 mt-0.5">Record payment for {employee.name}</p>
          </div>
          <button 
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className={`mb-4 p-3 ${moduleTheme.salary.bgLight} text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form id="paySalaryForm" onSubmit={handleSave} className="space-y-4">
            <TransactionDatePicker
              label="Payment Date"
              value={paymentDate}
              onChange={setPaymentDate}
            />

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Amount *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`pl-9 h-11 bg-white ${colors.neutral.border}`}
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Allow Advance Payment */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowAdvance"
                checked={allowAdvance}
                onChange={(e) => setAllowAdvance(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
              />
              <label htmlFor="allowAdvance" className="text-sm font-medium text-slate-700 select-none">
                Allow Advance Payment
              </label>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Payment Method *</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', icon: Banknote },
                  { id: 'UPI', icon: CreditCard },
                  { id: 'Bank', icon: CreditCard }
                ].map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as 'Cash' | 'UPI' | 'Bank')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{method.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Notes (Optional)</Label>
              <div className="relative">
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`w-full text-sm rounded-lg border ${colors.neutral.border} bg-white pl-9 pr-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 resize-none`}
                  placeholder="e.g. August Salary"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-slate-100 ${colors.neutral.bg} flex gap-3 shrink-0`}>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 bg-white"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="paySalaryForm"
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Save Payment'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
