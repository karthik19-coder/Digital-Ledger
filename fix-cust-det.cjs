const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');

// Add state variables
content = content.replace(
  "const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);",
  `const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  const [creditError, setCreditError] = useState<string | null>(null);
  const [isAddingCredit, setIsAddingCredit] = useState(false);`
);

// Add Plus icon import
content = content.replace(
  "CheckCircle2, CreditCard, Calendar, FileText, Tag",
  "CheckCircle2, CreditCard, Calendar, FileText, Tag, Plus"
);

// Add handleAddCredit function
content = content.replace(
  "const handleRecordPayment =",
  `const handleAddCredit = async (e: React.FormEvent) => {
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
      
      const date = new Date().toISOString();
      await customerService.addCredit(
        id, 
        amountNum, 
        date, 
        '', 
        creditNotes.trim()
      );
      
      setIsCreditModalOpen(false);
      setCreditAmount('');
      setCreditNotes('');
      setSuccessMessage('Credit added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      const summary = await dashboardService.getDailySummary();
      useDashboardStore.setState(summary as any);
      window.dispatchEvent(new Event('dashboard-refresh'));
      
      loadData();
    } catch (error: any) {
      console.error('Error adding credit:', error);
      setCreditError(error.message || 'Failed to add credit.');
    } finally {
      setIsAddingCredit(false);
    }
  };

  const handleRecordPayment =`
);

// Replace fixed action button
const fixedActionRegex = /\{\/\* Fixed Action Button \*\/\}.*?<\/div>/s;
content = content.replace(fixedActionRegex, `{/* Fixed Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 sm:left-64 z-10 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 font-medium h-12 rounded-xl text-lg shadow-sm"
            onClick={() => setIsCreditModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Credit
          </Button>
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium h-12 rounded-xl text-lg shadow-sm"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={customer.total_credit <= 0}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>`);

// Add Credit Modal
const creditModal = `
      {/* Add Credit Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Credit</h2>
              <button 
                onClick={() => setIsCreditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCredit} className="p-4 sm:p-6 space-y-4">
              {creditError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {creditError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="creditAmount" className="text-sm font-medium text-slate-700">Credit Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium">₹</span>
                  </div>
                  <Input 
                    id="creditAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    placeholder="Enter amount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="pl-8 font-semibold text-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="creditNotes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="creditNotes"
                    placeholder="Add notes..."
                    value={creditNotes}
                    onChange={(e) => setCreditNotes(e.target.value)}
                    className="w-full min-h-[80px] text-sm rounded-md border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsCreditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={isAddingCredit || !creditAmount}
                >
                  {isAddingCredit ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Credit'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Record Payment Modal */}', creditModal + '\n      {/* Record Payment Modal */}');

fs.writeFileSync('src/pages/CustomerDetails.tsx', content);
