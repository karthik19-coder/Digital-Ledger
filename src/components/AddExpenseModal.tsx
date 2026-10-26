import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, ReceiptText, IndianRupee, Calendar, FileText, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { expenseService } from '../services/expense.service';
import { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseType } from '../types/expense';
import { dashboardService } from '../services/dashboard.service';
import { transactionService } from '../services/transaction.service';
import { useDashboardStore } from '../store/dashboard.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionDatePicker } from './TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pass an existing expense to enable edit mode */
  initialExpense?: Expense;
}

export function AddExpenseModal({ isOpen, onClose, onSuccess, initialExpense }: AddExpenseModalProps) {
  const isEditMode = !!initialExpense;

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

  const isCustomCategory =
    !!initialExpense?.category &&
    !categories.some(c => c.name === initialExpense.category);

  const [category, setCategory] = useState(
    isEditMode && !isCustomCategory ? (initialExpense?.category ?? '') : ''
  );
  const [customCategory, setCustomCategory] = useState(
    isEditMode && isCustomCategory ? (initialExpense?.category ?? '') : ''
  );
  const [showCustom, setShowCustom] = useState(isEditMode && isCustomCategory);
  const [expenseType, setExpenseType] = useState<ExpenseType | ''>(
    initialExpense?.expense_type ?? ''
  );
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() ?? '');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | ''>(
    initialExpense?.payment_method ?? ''
  );
  
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const globalDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const [expenseDate, setExpenseDate] = useState(
    initialExpense?.expense_date ?? globalDateStr
  );
  
  // Sync global business date when expense date changes (and not in edit mode)
  useEffect(() => {
    if (!isEditMode && expenseDate && expenseDate !== globalDateStr) {
      setSelectedDate(new Date(expenseDate));
    }
  }, [expenseDate, isEditMode]);

  const [referenceNumber, setReferenceNumber] = useState(initialExpense?.reference_number ?? '');
  const [notes, setNotes] = useState(initialExpense?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load categories
  useEffect(() => {
    if (isOpen) {
      setIsCategoriesLoading(true);
      expenseService.getCategories().then((cats) => {
        setCategories(cats);
        setIsCategoriesLoading(false);
      }).catch((err) => {
        console.error('Failed to load categories', err);
        setIsCategoriesLoading(false);
      });
    }
  }, [isOpen]);

  // Re-seed state when initialExpense changes (switching between edits)
  useEffect(() => {
    if (!isOpen || isCategoriesLoading) return;
    const custom = !!initialExpense?.category && !categories.some(c => c.name === initialExpense.category);
    setCategory(initialExpense && !custom ? initialExpense.category : '');
    setCustomCategory(initialExpense && custom ? initialExpense.category : '');
    setShowCustom(custom);
    setExpenseType(initialExpense?.expense_type ?? '');
    setAmount(initialExpense?.amount?.toString() ?? '');
    setPaymentMethod(initialExpense?.payment_method ?? '');
    setExpenseDate(initialExpense?.expense_date ?? globalDateStr);
    setReferenceNumber(initialExpense?.reference_number ?? '');
    setNotes(initialExpense?.notes ?? '');
    setError(null);
  }, [isOpen, initialExpense, categories, isCategoriesLoading]);

  if (!isOpen) return null;

  const resetForm = () => {
    setCategory('');
    setCustomCategory('');
    setShowCustom(false);
    setExpenseType('');
    setAmount('');
    setPaymentMethod('');
    setExpenseDate(globalDateStr);
    setReferenceNumber('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCategoryChange = (val: string) => {
    if (val === '__custom__') {
      setShowCustom(true);
      setCategory('');
    } else {
      setShowCustom(false);
      setCustomCategory('');
      setCategory(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = showCustom ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Expense Category is required.');
      return;
    }
    if (!expenseType) {
      setError('Expense Type is required.');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!paymentMethod) {
      setError('Payment Method is required.');
      return;
    }
    if (!expenseDate) {
      setError('Expense Date is required.');
      return;
    }

    const payload = {
      category: finalCategory,
      expense_type: expenseType as ExpenseType,
      amount: amountNum,
      payment_method: paymentMethod as ExpensePaymentMethod,
      expense_date: expenseDate,
      reference_number: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setIsSaving(true);
    try {
      if (isEditMode && initialExpense) {
        // For edits, we need to recalculate both the old date (if changed) and new date
        await transactionService.executeTransaction(
          payload,
          expenseDate,
          async () => {
            await expenseService.updateExpense(initialExpense.id, payload);
            if (initialExpense.expense_date !== expenseDate) {
              // Trigger recalculation for the old date as well
              transactionService._queueRecalculation(initialExpense.expense_date, []);
            }
          },
          ['expenses-refresh']
        );
      } else {
        await transactionService.executeTransaction(
          payload,
          expenseDate,
          () => expenseService.addExpense(payload),
          ['expenses-refresh']
        );
      }

      // We still update local store if needed for rapid visual response,
      // but event dispatch is handled by transactionService.
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);

      resetForm();
      onSuccess();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${moduleTheme.expenses.bgLight} rounded-lg`}>
              <ReceiptText className={`w-5 h-5 ${moduleTheme.expenses.text}`} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditMode ? 'Edit Expense' : 'Add Expense'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className={`p-3 ${moduleTheme.expenses.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <TransactionDatePicker
              label="Transaction Date"
              value={expenseDate}
              onChange={setExpenseDate}
            />

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="expCategory" className="text-sm font-medium text-slate-700">
                Expense Category <span className={`${moduleTheme.expenses.textLight}`}>*</span>
              </Label>
              <select
                id="expCategory"
                value={showCustom ? '__custom__' : category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`w-full text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2`}
              >
                <option value="">Select category...</option>
                {Array.from(new Set([
                  'Rent', 'Electricity', 'Water', 'Internet', 'Transport', 
                  'Packaging', 'Cleaning', 'Maintenance', 'Office Supplies', 
                  'Grocery Supplies', 'Miscellaneous',
                  ...categories.filter(c => c.name !== 'Salary').map(c => c.name)
                ])).map((catName) => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
                <option value="__custom__">+ Custom Category</option>
              </select>
              {showCustom && (
                <Input
                  id="customCategory"
                  placeholder="Enter custom category..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 bg-white"
                />
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-slate-700">
                Amount <span className={`${moduleTheme.expenses.textLight}`}>*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                  ₹
                </span>
                <Input 
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 font-semibold text-lg"
                />
              </div>
            </div>

            {/* Expense Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Expense Type <span className={`${moduleTheme.expenses.textLight}`}>*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    { value: 'business', label: 'Business Expense', desc: 'Rent, Salary, Bills, Supplies', color: 'blue' },
                    { value: 'personal', label: 'Personal Withdrawal', desc: 'Owner withdrawal, Personal cash', color: 'purple' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpenseType(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      expenseType === opt.value
                        ? opt.color === 'blue'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-1 ${
                      expenseType === opt.value
                        ? opt.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                        : 'text-slate-700'
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        expenseType === opt.value
                          ? opt.color === 'blue' ? 'border-blue-500' : 'border-purple-500'
                          : 'border-slate-300'
                      }`}>
                        {expenseType === opt.value && (
                          <div className={`w-1.5 h-1.5 rounded-full ${opt.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                        )}
                      </div>
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight ml-5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Payment Method <span className={`${moduleTheme.expenses.textLight}`}>*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI', 'Bank'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      paymentMethod === method
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>



            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="expNotes" className="text-sm font-medium text-slate-700">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <textarea
                  id="expNotes"
                  placeholder="Add any details about this expense..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full min-h-[70px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 resize-none`}
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col sm:flex-row gap-3 shrink-0`}>
            <Button
              type="button"
              variant="outline"
              className={`w-full sm:flex-1 bg-white hover:${colors.neutral.bg}`}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`w-full sm:flex-1 ${moduleTheme.expenses.bg} ${moduleTheme.expenses.bgHover} text-white font-semibold shadow-sm`}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : isEditMode ? (
                'Update Expense'
              ) : (
                'Save Expense'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
