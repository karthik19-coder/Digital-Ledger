const fs = require('fs');

let content = fs.readFileSync('src/pages/Credit.tsx', 'utf8');

// 1. Add imports Edit, Trash2, ChevronRight
content = content.replace(
  "Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';",
  "Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2, ChevronRight } from 'lucide-react';"
);

// 2. Add editing / deleting states
const statesToInject = `
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
`;
content = content.replace(
  "const [successMessage, setSuccessMessage] = useState<string | null>(null);",
  "const [successMessage, setSuccessMessage] = useState<string | null>(null);" + statesToInject
);

// 3. Update handleAddCustomer to support edit
const oldHandleAddCustomer = `  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    
    if (!newCustomer.name.trim()) {
      setAddError('Customer Name is required');
      return;
    }
    
    setIsAdding(true);
    try {
      const allCustomers = await customerService.getCustomers();
      const duplicate = allCustomers.find(c => c.name.toLowerCase() === newCustomer.name.trim().toLowerCase());
      
      if (duplicate) {
        setAddError('Customer already exists.');
        setIsAdding(false);
        return;
      }
      
      await customerService.createCustomer({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim(),
      });
      
      setIsAddDialogOpen(false);
      setNewCustomer({ name: '', phone: '', address: '' });
      setSuccessMessage('Customer added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      setAddError('Failed to add customer. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };`;

const newHandleAddCustomer = `  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    
    if (!newCustomer.name.trim()) {
      setAddError('Customer Name is required');
      return;
    }
    
    setIsAdding(true);
    try {
      if (editingCustomerId) {
        await customerService.updateCustomer(editingCustomerId, {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          address: newCustomer.address.trim(),
        });
        setSuccessMessage('Customer updated successfully');
      } else {
        const allCustomers = await customerService.getCustomers();
        const duplicate = allCustomers.find(c => c.name.toLowerCase() === newCustomer.name.trim().toLowerCase() && c.id !== editingCustomerId);
        
        if (duplicate) {
          setAddError('Customer already exists.');
          setIsAdding(false);
          return;
        }
        
        await customerService.createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          address: newCustomer.address.trim(),
        });
        setSuccessMessage('Customer added successfully');
      }
      
      setIsAddDialogOpen(false);
      setNewCustomer({ name: '', phone: '', address: '' });
      setEditingCustomerId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      setAddError(editingCustomerId ? 'Failed to update customer. Please try again.' : 'Failed to add customer. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setEditingCustomerId(customer.id);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerToDelete.id);
      
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      setSuccessMessage('Customer deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCustomerId(null);
    setNewCustomer({ name: '', phone: '', address: '' });
  };`;

content = content.replace(oldHandleAddCustomer, newHandleAddCustomer);

// 4. Update "Add Customer" to "Add Customer" or "Edit Customer" dynamically
content = content.replace(
  /<h2 className="text-xl font-bold text-slate-900">Add Customer<\/h2>/g,
  '<h2 className="text-xl font-bold text-slate-900">{editingCustomerId ? "Edit Customer" : "Add Customer"}</h2>'
);

content = content.replace(
  /onClick=\{\(\) => setIsAddDialogOpen\(false\)\}/g,
  'onClick={handleCloseAddDialog}'
);

content = content.replace(
  /'Save Customer'/g,
  'editingCustomerId ? "Update Customer" : "Save Customer"'
);

// 5. Update the Card rendering to include footer
const oldCardContent = `<div className="flex items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                    <span>Updated {format(new Date(customer.updated_at), 'dd MMM, yy')}</span>
                  </div>
                </Link>
              </CardContent>`;

const newCardContent = `<div className="flex items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                    <span>Updated {format(new Date(customer.updated_at), 'dd MMM, yy')}</span>
                  </div>
                </Link>
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 h-8 px-2"
                      onClick={() => handleEditClick(customer)}
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-slate-600 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                      onClick={() => handleDeleteClick(customer)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                  <Link 
                    to={\`/credit/\${customer.id}\`} 
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>`;

content = content.replace(oldCardContent, newCardContent);


// 6. Add Delete Confirmation Dialog at the end, right before </div>\n  );\n}
const deleteDialogHTML = `      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Delete Customer</h2>
              <button 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {customerToDelete.total_credit > 0 ? (
                <>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-orange-800">Cannot Delete Customer</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Customer cannot be deleted until the outstanding balance of <strong>{formatCurrency(customerToDelete.total_credit)}</strong> is cleared.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex flex-col md:flex-row gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-600 text-sm">
                    Are you sure you want to delete <strong>{customerToDelete.name}</strong>? This action will also remove all associated transaction history and cannot be undone.
                  </p>
                  <div className="pt-4 flex flex-col md:flex-row gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full md:flex-1"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive"
                      className="w-full md:flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                      ) : (
                        'Delete Customer'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.replace("    </div>\n  );\n}", deleteDialogHTML + "    </div>\n  );\n}");

// 7. In the 'No results found' etc, let's keep it clean
fs.writeFileSync('src/pages/Credit.tsx', content);

console.log("Rewrite completed successfully!");
