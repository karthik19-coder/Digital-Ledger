const fs = require('fs');
let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

content = content.replace(
  "const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', initial_credit: '' });",
  "const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', initial_credit: '', notes: '' });"
);

content = content.replace(
  "setNewCustomer({ name: '', phone: '', address: '', initial_credit: '' });",
  "setNewCustomer({ name: '', phone: '', address: '', initial_credit: '', notes: '' });"
);

const notesFieldHtml = `
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <textarea 
                    id="notes"
                    placeholder="Enter notes..."
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                    className="w-full min-h-[60px] text-sm rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>`;

content = content.replace(
  '              <div className="pt-4 flex items-center gap-3">',
  notesFieldHtml + '\n\n              <div className="pt-4 flex items-center gap-3">'
);

fs.writeFileSync('src/pages/Credit.tsx', content);
