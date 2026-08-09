import { useState, useEffect } from 'react';
import { X, Plus, Loader2, AlertCircle, UserPlus, Store } from 'lucide-react';
import { format } from 'date-fns';
import { vendorService } from '../services/vendor.service';
import { stockService } from '../services/stock.service';
import { dashboardService } from '../services/dashboard.service';
import { transactionService } from '../services/transaction.service';
import { useDashboardStore } from '../store/dashboard.store';
import { Vendor } from '../types/vendor';
import { StockPurchase } from '../types/stock';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TransactionDatePicker } from './TransactionDatePicker';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPurchase?: StockPurchase; // when provided = edit mode
}

export function AddPurchaseModal({ isOpen, onClose, onSuccess, initialPurchase }: AddPurchaseModalProps) {
  const isEditMode = !!initialPurchase;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const globalDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const [purchaseDate, setPurchaseDate] = useState(
    initialPurchase ? initialPurchase.purchase_date.split('T')[0] : globalDateStr
  );
  
  useEffect(() => {
    if (!isEditMode && purchaseDate && purchaseDate !== globalDateStr) {
      setSelectedDate(new Date(purchaseDate));
    }
  }, [purchaseDate, isEditMode]);
  
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'paid' | 'partial' | 'credit'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');

  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', phone: '', address: '' });
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVendors();
      if (initialPurchase) {
        setSelectedVendorId(initialPurchase.vendor_id);
        setInvoiceNumber(initialPurchase.invoice_number || '');
        setPurchaseDate(initialPurchase.purchase_date.split('T')[0]);
        setPurchaseAmount(initialPurchase.purchase_amount.toString());
        setPaymentType(initialPurchase.payment_type);
        setAmountPaid(initialPurchase.payment_type === 'partial' ? initialPurchase.paid_amount.toString() : '');
        setPaymentMethod(initialPurchase.payment_method || 'Cash');
        setNotes(initialPurchase.notes || '');
        setError(null);
        setIsAddingVendor(false);
        setNewVendor({ name: '', phone: '', address: '' });
        setVendorError(null);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialPurchase]);

  const loadVendors = async () => {
    setIsLoadingVendors(true);
    try {
      const data = await vendorService.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const resetForm = () => {
    setSelectedVendorId('');
    setInvoiceNumber('');
    setPurchaseDate(globalDateStr);
    setPurchaseAmount('');
    setPaymentType('paid');
    setAmountPaid('');
    setPaymentMethod('Cash');
    setNotes('');
    setError(null);
    setIsAddingVendor(false);
    setNewVendor({ name: '', phone: '', address: '' });
    setVendorError(null);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorError(null);
    if (!newVendor.name.trim()) { setVendorError('Vendor Name is required'); return; }
    setIsSavingVendor(true);
    try {
      const created = await vendorService.createVendor({
        name: newVendor.name.trim(),
        phone: newVendor.phone.trim(),
        address: newVendor.address.trim(),
      });
      await loadVendors();
      setSelectedVendorId(created.id);
      setIsAddingVendor(false);
      setNewVendor({ name: '', phone: '', address: '' });
    } catch (err: unknown) {
      setVendorError((err instanceof Error ? err.message : String(err)) || 'Failed to create vendor');
    } finally {
      setIsSavingVendor(false);
    }
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedVendorId) { setError('Please select a vendor.'); return; }
    const amountNum = parseFloat(purchaseAmount);
    if (isNaN(amountNum) || amountNum <= 0) { setError('Purchase Amount must be greater than zero.'); return; }
    if (!purchaseDate) { setError('Purchase Date is required.'); return; }

    let calculatedPaidAmount = 0;
    if (paymentType === 'paid') {
      calculatedPaidAmount = amountNum;
    } else if (paymentType === 'partial') {
      const paidNum = parseFloat(amountPaid);
      if (isNaN(paidNum) || paidNum <= 0) { setError('Amount Paid must be greater than zero.'); return; }
      if (paidNum > amountNum) { setError('Amount Paid cannot exceed Purchase Amount.'); return; }
      calculatedPaidAmount = paidNum;
    }

    if ((paymentType === 'paid' || paymentType === 'partial') && !paymentMethod) {
      setError('Payment Method is required.'); return;
    }

    const purchasePayload = {
      vendor_id: selectedVendorId,
      invoice_number: invoiceNumber.trim() || undefined,
      purchase_date: purchaseDate,
      purchase_amount: amountNum,
      payment_type: paymentType,
      paid_amount: calculatedPaidAmount,
      payment_method: (paymentType === 'paid' || paymentType === 'partial') ? paymentMethod : undefined,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode && initialPurchase) {
        await transactionService.executeTransaction(
          purchasePayload,
          purchaseDate,
          async () => {
            await stockService.updatePurchase(initialPurchase.id, purchasePayload);
            const initialDate = initialPurchase.purchase_date.split('T')[0];
            if (initialDate !== purchaseDate) {
              transactionService._queueRecalculation(initialDate, []);
            }
          },
          ['stock-refresh', 'vendors-refresh']
        );
      } else {
        await transactionService.executeTransaction(
          purchasePayload,
          purchaseDate,
          () => stockService.addPurchase(purchasePayload),
          ['stock-refresh', 'vendors-refresh']
        );
      }
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to save purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] sm:max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Purchase' : 'Add Purchase'}</h2>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="add-purchase-form" onSubmit={handleSubmitPurchase} className="space-y-4">

            {/* Purchase Amount */}
            <div className="space-y-2">
              <Label htmlFor="purchaseAmount" className="text-sm font-medium text-slate-700">
                Purchase Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                  id="purchaseAmount"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="w-full pl-12 pr-4 text-lg font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* Vendor Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vendor" className="text-sm font-medium text-slate-700">
                  Vendor <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsAddingVendor(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Add New Vendor
                </button>
              </div>
              {isLoadingVendors ? (
                <div className={`h-10 border ${colors.neutral.border} rounded-md flex items-center px-3 text-slate-400 text-sm`}>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading vendors...
                </div>
              ) : (
                <select
                  id="vendor"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className={`w-full h-10 px-3 text-sm rounded-md border ${colors.neutral.border} bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2`}
                >
                  <option value="">Select Vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.phone ? `(${v.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>


            {/* Payment Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Payment Type <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['paid', 'partial', 'credit'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      paymentType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid (Partial only) */}
            {paymentType === 'partial' && (
              <div className="space-y-2 animate-in fade-in">
                <Label htmlFor="amountPaid" className="text-sm font-medium text-slate-700">
                  Amount Paid <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="amountPaid"
                    type="number"
                    step="any"
                    placeholder="Enter paid amount"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-12 pr-4"
                  />
                </div>
              </div>
            )}

            {/* Payment Method (Paid or Partial) */}
            {(paymentType === 'paid' || paymentType === 'partial') && (
              <div className="space-y-2 animate-in fade-in">
                <Label className="text-sm font-medium text-slate-700">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Bank'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        paymentMethod === method
                          ? 'border-green-600 bg-green-50 text-green-700 font-semibold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Invoice Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TransactionDatePicker
                label="Purchase Date"
                value={purchaseDate}
                onChange={setPurchaseDate}
              />
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-sm font-medium text-slate-700">
                  Invoice Number <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="invoiceNumber"
                  placeholder="e.g. INV-1029"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <textarea
                id="notes"
                placeholder="Add purchase notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full min-h-[70px] text-sm rounded-md border ${colors.neutral.border} bg-white p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 resize-none`}
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex gap-3 shrink-0`}>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            type="submit"
            form="add-purchase-form"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              isEditMode ? 'Update Purchase' : 'Save Purchase'
            )}
          </Button>
        </div>
      </div>

      {/* Sub-modal: Inline Add Vendor */}
      {isAddingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Add New Vendor
              </h3>
              <button
                onClick={() => setIsAddingVendor(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-4 sm:p-6 space-y-4">
              {vendorError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{vendorError}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="vName" className="text-xs font-semibold text-slate-700">Vendor Name *</Label>
                <Input id="vName" placeholder="e.g. Metro Wholesalers" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vPhone" className="text-xs font-semibold text-slate-700">Phone (Optional)</Label>
                <Input id="vPhone" placeholder="e.g. 9876543210" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vAddress" className="text-xs font-semibold text-slate-700">Address (Optional)</Label>
                <textarea
                  id="vAddress"
                  placeholder="Vendor address..."
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  className={`w-full min-h-[60px] text-xs rounded-md border ${colors.neutral.border} p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-slate-950`}
                />
              </div>
              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setIsAddingVendor(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={isSavingVendor}>
                  {isSavingVendor ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Vendor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
