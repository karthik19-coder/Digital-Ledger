const fs = require('fs');

const code = `import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, MapPin, Loader2, X, AlertCircle, 
  CheckCircle2, CreditCard, Calendar, FileText, Tag 
} from 'lucide-react';
import { format } from 'date-fns';
import { customerService, Customer, CustomerTransaction } from '../services/customer.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!id) return;
      const cust = await customerService.getCustomer(id);
      if (!cust) {
        navigate('/credit');
        return;
      }
      setCustomer(cust);
      
      const txs = await customerService.getCustomerTransactions(id);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setIsLoading(false);
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
    
    if (customer && amountNum > customer.total_credit) {
      setPaymentError('Payment cannot exceed outstanding balance.');
      return;
    }
    
    setIsRecording(true);
    try {
      if (!id) return;
      
      const date = new Date().toISOString();
      await customerService.recordPayment(
        id, 
        amountNum, 
        date, 
        paymentReference.trim(), 
        paymentNotes.trim()
      );
      
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      setSuccessMessage('Payment recorded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      setPaymentError(error.message || 'Failed to record payment.');
    } finally {
      setIsRecording(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
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
    <div className="p-4 sm:p-6 pb-24 bg-slate-50 min-h-screen">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      <div className="mb-6">
        <Link to="/credit" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Credit
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Customer Details</h1>
      </div>

      <Card className="shadow-sm border-slate-200 mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-400" />
                {customer.name}
              </h2>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-slate-600">
              <Phone className="w-4 h-4 mr-3 text-slate-400" />
              <span>{customer.phone || <span className="text-slate-400 italic">No phone number</span>}</span>
            </div>
            <div className="flex items-start text-slate-600">
              <MapPin className="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" />
              <span>{customer.address || <span className="text-slate-400 italic">No address</span>}</span>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">
            <div>
              <p className="text-orange-800 text-xs font-semibold uppercase tracking-wider mb-1">
                Outstanding Balance
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(customer.total_credit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Transaction History</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm mb-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No transactions available.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-24">
          {transactions.map((tx) => (
            <Card key={tx.id} className="shadow-sm border-slate-200 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className={\`w-8 h-8 rounded-full flex items-center justify-center mr-3 \${tx.type === 'credit' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}\`}>
                      {tx.type === 'credit' ? <CreditCard className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 capitalize">{tx.type}</p>
                      <p className="text-xs text-slate-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(tx.date), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={\`font-bold \${tx.type === 'credit' ? 'text-orange-600' : 'text-green-600'}\`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
                
                {(tx.reference || tx.notes) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {tx.reference && (
                      <p className="text-xs text-slate-600 flex items-center">
                        <Tag className="w-3 h-3 mr-1.5 text-slate-400" />
                        <span className="font-medium mr-1">Ref:</span> {tx.reference}
                      </p>
                    )}
                    {tx.notes && (
                      <p className="text-xs text-slate-600 flex items-start">
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

      {/* Fixed Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 sm:left-64 z-10 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-12 rounded-xl text-lg shadow-sm"
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={customer.total_credit <= 0}
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-4 sm:p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {paymentError}
                </div>
              )}
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Outstanding Balance</span>
                  <span className="text-base font-bold text-slate-900">{formatCurrency(customer.total_credit)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700">Payment Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium">₹</span>
                  </div>
                  <Input 
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={customer.total_credit}
                    autoFocus
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-8 font-semibold text-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-medium text-slate-700">Reference <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input 
                    id="reference"
                    placeholder="e.g. UTR / Check No."
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="notes"
                    placeholder="Add payment notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full min-h-[80px] text-sm rounded-md border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isRecording || !paymentAmount}
                >
                  {isRecording ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Payment'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync('src/pages/CustomerDetails.tsx', code);
