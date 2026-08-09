const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');

// 1. Remove paymentReference state
content = content.replace(
  "const [paymentAmount, setPaymentAmount] = useState('');\n  const [paymentReference, setPaymentReference] = useState('');\n  const [paymentNotes, setPaymentNotes] = useState('');",
  "const [paymentAmount, setPaymentAmount] = useState('');\n  const [paymentNotes, setPaymentNotes] = useState('');"
);

// 2. Change recordPayment to use empty string for reference and rename button text
content = content.replace(
  "        id, \n        amountNum, \n        date, \n        paymentReference.trim(), \n        paymentNotes.trim()\n      );\n      \n      setIsPaymentModalOpen(false);\n      setPaymentAmount('');\n      setPaymentReference('');\n      setPaymentNotes('');",
  "        id, \n        amountNum, \n        date, \n        '', \n        paymentNotes.trim()\n      );\n      \n      setIsPaymentModalOpen(false);\n      setPaymentAmount('');\n      setPaymentNotes('');"
);

// 3. Insert buttons above Outstanding Balance
content = content.replace(
  `            <div className="flex items-start text-slate-600">
              <MapPin className="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" />
              <span>{customer.address || <span className="text-slate-400 italic">No address</span>}</span>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">`,
  `            <div className="flex items-start text-slate-600">
              <MapPin className="w-4 h-4 mr-3 mt-0.5 text-slate-400 shrink-0" />
              <span>{customer.address || <span className="text-slate-400 italic">No address</span>}</span>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Button 
              variant="outline"
              className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 font-medium h-12 rounded-xl text-sm sm:text-base shadow-sm"
              onClick={() => setIsCreditModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Credit
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium h-12 rounded-xl text-sm sm:text-base shadow-sm"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={customer.total_credit <= 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Receive Payment
            </Button>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">`
);

// 4. Remove Fixed Action Buttons
content = content.replace(
  `      {/* Fixed Action Buttons */}
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
      </div>`,
  ""
);

// 5. Remove Reference field from Record Payment Modal and change Title/Button to Receive Payment
content = content.replace(
  `              <div className="space-y-2">
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
              </div>`,
  ""
);

content = content.replace("Record Payment</h2>", "Receive Payment</h2>");
content = content.replace("'Save Payment'", "'Receive Payment'");

fs.writeFileSync('src/pages/CustomerDetails.tsx', content);

console.log("Updated CustomerDetails.tsx");
