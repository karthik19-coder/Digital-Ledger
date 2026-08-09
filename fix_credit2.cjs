const fs = require('fs');

const content = `import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, Phone, Loader2, Users, X, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { customerService, Customer } from '../services/customer.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function Credit() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
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
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
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
    <div className="p-4 sm:p-6 pb-24 bg-slate-50 min-h-screen">
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customer Credit</h1>
        </div>

        <Card className="bg-orange-600 text-white shadow-md border-0">
          <CardContent className="p-6">
            <p className="text-orange-100 text-sm font-medium uppercase tracking-wider mb-1">
              Total Outstanding
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {formatCurrency(totalOutstanding)}
            </h2>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input 
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 h-10"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm mt-8">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No customers</h3>
          <p className="text-sm text-slate-500 mb-6">
            No customers with outstanding credit.
          </p>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm mt-8">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No results found</h3>
          <p className="text-sm text-slate-500">
            No customers match your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <Card 
              key={customer.id} 
              className="shadow-sm border-slate-200 overflow-hidden hover:border-orange-200 transition-colors"
            >
              <CardContent className="p-0">
                <Link to={\`/credit/\${customer.id}\`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 flex items-center">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        {customer.name}
                      </h3>
                      {customer.phone && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-medium tracking-wider mb-1">Due</p>
                      <p className="font-bold text-orange-600">
                        {formatCurrency(customer.total_credit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                    <span>Updated {format(new Date(customer.updated_at), 'dd MMM, yy')}</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Customer</h2>
              <button 
                onClick={() => setIsAddDialogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-4 sm:p-6 space-y-4">
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
                    className="w-full min-h-[80px] text-sm rounded-md border border-slate-200 bg-white px-3 py-2 pl-10 text-slate-900 ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Customer'
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

fs.writeFileSync('src/pages/Credit.tsx', content);
