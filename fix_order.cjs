const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDetails.tsx', 'utf8');

const buttonsHtml = `
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
`;

content = content.replace(buttonsHtml, "");

const balanceHtml = `          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">
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
      </Card>`;

const replacementHtml = `          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between mb-6">
            <div>
              <p className="text-orange-800 text-xs font-semibold uppercase tracking-wider mb-1">
                Outstanding Balance
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(customer.total_credit)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
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
        </CardContent>
      </Card>`;

content = content.replace(balanceHtml, replacementHtml);

fs.writeFileSync('src/pages/CustomerDetails.tsx', content);

console.log("Updated order");
