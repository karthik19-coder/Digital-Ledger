import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2, ChevronRight, Clock, SearchX, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { customerService, Customer } from '../services/customer.service';
import { calculateCustomerDueSince, DueSinceInfo } from '../utils/dueSince';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  ModuleSearchBar,
  EmptyState,
  FinancialCard,
  CardActionBar,
  ExportButton
} from '../components/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHero, PrimaryActionButton, HistoryCard } from '../components/shared';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { customersListExportProvider } from '../services/export/providers/customersListExportProvider';

import { useQueryCache } from '../hooks/useQueryCache';
import { useCachedState } from '../hooks/useCachedState';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';

export default function Credit() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, requirePermission } = usePermissions();
  
  const fetchCustomers = async () => {
    const data = await customerService.getCustomers();
    const dueMap: Record<string, DueSinceInfo | null> = {};
    await Promise.all(
      data.map(async (c) => {
        if (c.total_credit > 0) {
          const txs = await customerService.getCustomerTransactions(c.id);
          dueMap[c.id] = calculateCustomerDueSince(txs, c.total_credit);
        } else {
          dueMap[c.id] = null;
        }
      })
    );
    return { customers: data, dueSinceMap: dueMap };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadCustomers } = useQueryCache(
    'credit-customers-list',
    fetchCustomers
  );

  const customers = cachedRes?.customers || [];
  const dueSinceMap = cachedRes?.dueSinceMap || {};

  const [searchQuery, setSearchQuery] = useCachedState('credit-search', '');
  
  const { isOpen: isAddDialogOpen, openModal: openAddDialog, closeModal: closeAddDialog } = useModalNavigation('credit-add-customer');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const { isOpen: isDeleteDialogOpen, openModal: openDeleteDialog, closeModal: closeDeleteDialog } = useModalNavigation('credit-delete-customer');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (location.state?.openAdd) {
      const state = { ...location.state };
      delete state.openAdd;
      navigate(location.pathname, { replace: true, state });
      setTimeout(() => openAddDialog(), 0);
    }
  }, [location.state, navigate, location.pathname, openAddDialog]);

  const handleAddCustomer = async (e: React.FormEvent) => {
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
        
        const createdCustomer = await customerService.createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          address: newCustomer.address.trim(),
        });
        setSuccessMessage('Customer added successfully');
        
        closeAddDialog();
        setNewCustomer({ name: '', phone: '', address: '' });
        setEditingCustomerId(null);
        
        if (location.state?.autoOpenCredit) {
          navigate(`/credit/customers/${createdCustomer.id}`, { state: { openAddCredit: true }, replace: true });
          return; // Skip loading customers since we navigate away
        }
      }
      
      closeAddDialog();
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
    openAddDialog();
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    openDeleteDialog();
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerToDelete.id);
      
      closeDeleteDialog();
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
    closeAddDialog();
    setEditingCustomerId(null);
    setNewCustomer({ name: '', phone: '', address: '' });
  };


  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, customer) => sum + customer.total_credit, 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(lowerQuery) || (c.phone && c.phone.includes(lowerQuery)));
    }
    
    return [...result].sort((a, b) => b.total_credit - a.total_credit);
  }, [customers, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className={`pb-24 ${colors.neutral.bg} min-h-screen`}>
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 pb-24 safe-page-pb">
        {/* Header Banner */}
        <AppHeaderBanner
          theme="credit"
          title="Customer Credit"
          icon={Users}
          backTo="/"
        >
          <div className="relative">
            <HeaderSummaryCard 
              title="TOTAL OUTSTANDING" 
              amount={totalOutstanding} 
            />
            {filteredCustomers.length > 0 && (
              <div className="absolute top-4 right-4 z-20">
                <ExportButton 
                  data={() => customersListExportProvider.getExportData(filteredCustomers)}
                  className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
                />
              </div>
            )}
          </div>
          <HeaderActionGroup>
            <ModuleActionButton 
              icon={Plus} 
              label="Add Customer" 
              onClick={(e) => { if (requirePermission(e)) openAddDialog(); }} 
              variant="glass" 
              className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
            />
          </HeaderActionGroup>
        </AppHeaderBanner>

        <div className="px-4 sm:px-6 mt-6 relative z-20">
          <ModuleSearchBar 
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

      <div className="px-4 sm:px-6 mt-6">
        {customers.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No Customers Yet"
            subtitle="Add your first customer to start tracking credit and payments."
            action={
              <ModuleActionButton 
                icon={Plus} 
                label="Add Customer" 
                onClick={(e) => { if (requirePermission(e)) openAddDialog(); }} 
                variant="primary" 
                className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
              />
            }
          />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState 
            icon={SearchX}
            title="No results found"
            subtitle="No customers match your search query."
          />
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <FinancialCard
                key={customer.id}
                title={customer.name}
                subtitle={customer.phone ? `+91 ${customer.phone}` : 'No phone'}
                amount={customer.total_credit}
                amountColor={customer.total_credit > 0 ? "text-orange-600" : "text-slate-900"}
                icon={Users}
                theme="customerCredit"
                onClick={() => navigate(`/credit/customers/${customer.id}`)}
                onEdit={(e) => {
                  e.stopPropagation();
                  setEditingCustomerId(customer.id);
                  setNewCustomer({
                    name: customer.name,
                    phone: customer.phone || '',
                    address: customer.address || '',
                  });
                  openAddDialog();
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(customer);
                }}
                badge={
                  customer.total_credit > 0 && dueSinceMap[customer.id] ? (
                    <div className={`flex items-center gap-1 font-semibold text-[10px] sm:text-xs mt-1 ${dueSinceMap[customer.id]?.colorClass}`}>
                      <Clock className="w-3 h-3" />
                      <span>
                        {dueSinceMap[customer.id]?.days === 0 
                          ? 'Due Today' 
                          : `Due Since ${dueSinceMap[customer.id]?.days} ${dueSinceMap[customer.id]?.days === 1 ? 'Day' : 'Days'}`}
                      </span>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">{editingCustomerId ? "Edit Customer" : "Add Customer"}</h2>
              <button 
                onClick={handleCloseAddDialog}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {addError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {addError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Customer Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input 
                    id="name"
                    autoFocus
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input 
                    id="phone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-slate-700">Address <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea 
                    id="address"
                    placeholder="Enter customer address..."
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className={`w-full min-h-[80px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none`}
                  />
                </div>
              </div>

              </div>

              <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col md:flex-row gap-3 shrink-0`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  className={`w-full md:flex-1 bg-white hover:${colors.neutral.bg}`}
                  onClick={handleCloseAddDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className={`w-full md:flex-1 ${moduleTheme.customerCredit.bg} ${moduleTheme.customerCredit.bgHover} text-white font-semibold shadow-sm`}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    editingCustomerId ? "Update Customer" : "Save Customer"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Delete Customer</h2>
              <button 
                onClick={closeDeleteDialog}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {customerToDelete.total_credit > 0 ? (
                <>
                  <div className={`p-4 ${moduleTheme.customerCredit.bgLight} rounded-xl border border-orange-100 flex items-start gap-3`}>
                    <AlertCircle className={`w-5 h-5 ${moduleTheme.customerCredit.text} mt-0.5 shrink-0`} />
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
                      onClick={closeDeleteDialog}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className={`${colors.neutral.text} text-sm`}>
                    Are you sure you want to delete <strong>{customerToDelete.name}</strong>? This action will also remove all associated transaction history and cannot be undone.
                  </p>
                  <div className="pt-4 flex flex-col md:flex-row gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full md:flex-1"
                      onClick={closeDeleteDialog}
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
      </div>
    </div>
  );
}
