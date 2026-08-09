const fs = require('fs');

let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

// Replacements
content = content.replace(/Customer/g, 'Vendor');
content = content.replace(/customer/g, 'vendor');
content = content.replace(/CUSTOMERS/g, 'VENDORS');
content = content.replace(/Credit/g, 'Vendors');
content = content.replace(/credit/g, 'vendors');

// Fix the total_credit to total_due
content = content.replace(/\.total_credit/g, '.total_due');

// We need to add initial_due state for newVendor
content = content.replace(
  "const [newVendor, setNewVendor] = useState({ name: '', phone: '', address: '' });",
  "const [newVendor, setNewVendor] = useState({ name: '', phone: '', address: '', initial_due: '' });"
);

// We need to modify handleAddVendor
const oldHandleAdd = `  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    
    if (!newVendor.name.trim()) {
      setAddError('Vendor Name is required');
      return;
    }
    
    setIsAdding(true);
    try {
      if (editingVendorId) {
        await vendorService.updateVendor(editingVendorId, {
          name: newVendor.name.trim(),
          phone: newVendor.phone.trim(),
          address: newVendor.address.trim(),
        });
        setSuccessMessage('Vendor updated successfully');
      } else {
        const allVendors = await vendorService.getVendors();
        const duplicate = allVendors.find(c => c.name.toLowerCase() === newVendor.name.trim().toLowerCase() && c.id !== editingVendorId);
        
        if (duplicate) {
          setAddError('Vendor already exists.');
          setIsAdding(false);
          return;
        }
        
        await vendorService.createVendor({
          name: newVendor.name.trim(),
          phone: newVendor.phone.trim(),
          address: newVendor.address.trim(),
        });
        setSuccessMessage('Vendor added successfully');
      }
      
      setIsAddDialogOpen(false);
      setNewVendor({ name: '', phone: '', address: '' });
      setEditingVendorId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      setAddError(editingVendorId ? 'Failed to update vendor. Please try again.' : 'Failed to add vendor. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };`;

const newHandleAdd = `  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    
    if (!newVendor.name.trim()) {
      setAddError('Vendor Name is required');
      return;
    }

    const initialDueAmount = parseFloat(newVendor.initial_due);
    if (!editingVendorId && (isNaN(initialDueAmount) || initialDueAmount < 0)) {
      setAddError('Initial due must be a valid number >= 0');
      return;
    }
    
    setIsAdding(true);
    try {
      if (editingVendorId) {
        await vendorService.updateVendor(editingVendorId, {
          name: newVendor.name.trim(),
          phone: newVendor.phone.trim(),
          address: newVendor.address.trim(),
        });
        setSuccessMessage('Vendor updated successfully');
      } else {
        const allVendors = await vendorService.getVendors();
        const duplicate = allVendors.find(c => c.name.toLowerCase() === newVendor.name.trim().toLowerCase() && c.id !== editingVendorId);
        
        if (duplicate) {
          setAddError('Vendor already exists.');
          setIsAdding(false);
          return;
        }
        
        const createdVendor = await vendorService.createVendor({
          name: newVendor.name.trim(),
          phone: newVendor.phone.trim(),
          address: newVendor.address.trim(),
        });

        if (initialDueAmount > 0) {
          await vendorService.addPurchase(createdVendor.id, initialDueAmount, new Date().toISOString(), 'Opening Balance');
        }

        setSuccessMessage('Vendor added successfully');
      }
      
      setIsAddDialogOpen(false);
      setNewVendor({ name: '', phone: '', address: '', initial_due: '' });
      setEditingVendorId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      setAddError(editingVendorId ? 'Failed to update vendor. Please try again.' : 'Failed to add vendor. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };`;

content = content.replace(oldHandleAdd, newHandleAdd);

// Replace close dialog and edit clicks
content = content.replace(
  "setNewVendor({ name: '', phone: '', address: '' });",
  "setNewVendor({ name: '', phone: '', address: '', initial_due: '' });"
).replace(
  "setNewVendor({ name: '', phone: '', address: '' });",
  "setNewVendor({ name: '', phone: '', address: '', initial_due: '' });"
).replace(
  `    setNewVendor({
      name: vendor.name,
      phone: vendor.phone || '',
      address: vendor.address || '',
    });`,
  `    setNewVendor({
      name: vendor.name,
      phone: vendor.phone || '',
      address: vendor.address || '',
      initial_due: ''
    });`
);

// We need to inject the Initial Due field into the modal
const addressFieldHtml = `              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-slate-700">Address <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="address"
                    placeholder="Enter vendor address..."
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                    className="w-full min-h-[80px] text-sm rounded-md border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>`;

const initialDueHtml = `
              {!editingVendorId && (
                <div className="space-y-2">
                  <Label htmlFor="initial_due" className="text-sm font-medium text-slate-700">Initial Due Amount <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input 
                      id="initial_due"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={newVendor.initial_due}
                      onChange={(e) => setNewVendor({...newVendor, initial_due: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}`;

content = content.replace(addressFieldHtml, addressFieldHtml + initialDueHtml);
content = content.replace("import { IndianRupee } from 'lucide-react'", "import { IndianRupee, Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2, ChevronRight } from 'lucide-react'");
// Ensure IndianRupee is imported
if (!content.includes('IndianRupee')) {
  content = content.replace("Search, Plus,", "Search, Plus, IndianRupee,");
}

// Change colors: vendors usually use red/purple/blue? Let's use purple instead of orange to distinguish.
// Or maybe red for vendor due, since it's money we owe. Let's use red instead of orange.
content = content.replace(/orange/g, 'red');

// Wait, the page title should be Vendor Credit
content = content.replace("Vendor Vendors", "Vendor Credit"); // Since Credit -> Vendors replaced "Customer Credit" to "Vendor Vendors"

// Let's refine the titles
content = content.replace(/Vendor Vendors/g, "Vendor Credit");
content = content.replace(/Total Vendor Vendors/g, "Total Vendor Due");

// And formatting the Card output
// Total Vendor Vendors was replaced, let's make sure it is correct
fs.writeFileSync('src/pages/Vendors.tsx', content);

console.log("Created Vendors.tsx");
