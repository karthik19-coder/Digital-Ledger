import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Landmark } from 'lucide-react';
import { transactionService } from '../services/transaction.service';
import { businessFundsService } from '../services/businessFunds.service';
import { TransactionDatePicker } from './TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { format } from 'date-fns';
import { BusinessFundsTransaction } from '../types/businessFunds';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface AddBusinessFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BusinessFundsTransaction | null;
}

export function AddBusinessFundsModal({ isOpen, onClose, initialData }: AddBusinessFundsModalProps) {
  const { selectedDate } = useBusinessDate();
  const globalDateStr = format(selectedDate, 'yyyy-MM-dd');

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [transactionDate, setTransactionDate] = useState(globalDateStr);
  const [reason, setReason] = useState('Working Capital');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setPaymentMethod(initialData.payment_method as any);
        setTransactionDate(initialData.business_date);
        setReason(initialData.reason);
        setNotes(initialData.notes || '');
      } else {
        setAmount('');
        setPaymentMethod('Cash');
        setTransactionDate(globalDateStr);
        setReason('Working Capital');
        setNotes('');
      }
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialData, globalDateStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await transactionService.executeTransaction(
        { type: 'business_funds', amount: amountNum },
        transactionDate,
        () => initialData 
          ? businessFundsService.updateTransaction(
              initialData.id,
              {
                amount: amountNum,
                payment_method: paymentMethod,
                business_date: transactionDate,
                reason,
                notes: notes.trim()
              }
            )
          : businessFundsService.addFunds(
              amountNum,
              paymentMethod,
              transactionDate,
              reason,
              notes.trim()
            ),
        ['dashboard-refresh', 'app-data-refresh']
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      console.error('Error adding business funds:', err);
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to add business funds.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-emerald-100 text-emerald-600 rounded-xl`}>
              <Landmark className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? 'Edit Business Funds' : 'Add Business Funds'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col overflow-hidden min-h-0">
          {success ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-4 text-center h-full">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {initialData ? 'Changes Saved' : 'Funds Added Successfully!'}
              </h3>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`block w-full pl-12 pr-4 py-3 ${colors.neutral.bg} border ${colors.neutral.border} rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none`}
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                  Add To <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Cash', 'UPI'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      disabled={isSubmitting}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        paymentMethod === method
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <TransactionDatePicker
                  value={transactionDate}
                  onChange={setTransactionDate}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`block w-full px-4 py-3 ${colors.neutral.bg} border ${colors.neutral.border} rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none appearance-none`}
                  disabled={isSubmitting}
                >
                  <option value="Working Capital">Working Capital</option>
                  <option value="Cash Refill">Cash Refill</option>
                  <option value="Initial Investment">Initial Investment</option>
                  <option value="Emergency Funds">Emergency Funds</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`block w-full px-4 py-3 ${colors.neutral.bg} border ${colors.neutral.border} rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none`}
                  placeholder="Additional details..."
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={`flex-1 py-3.5 px-4 bg-white border-2 ${colors.neutral.border} hover:${colors.neutral.bg} hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount}
                  className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    initialData ? 'Save Changes' : 'Add Funds'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
