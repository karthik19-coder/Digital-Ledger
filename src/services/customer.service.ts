import { calculateCustomerDueSince } from '../utils/dueSince';
import { customerRepository } from '../repositories/customer.repository';

// Exporting the interfaces as they were defined in the service to maintain API compatibility
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  total_credit: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  business_date: string;
  created_at: string;
  updated_at: string;
  date?: string; // Kept for backward compatibility
  amount: number;
  type: 'credit' | 'payment';
  payment_method?: 'Cash' | 'UPI' | 'Bank';
  reference?: string;
  notes?: string;
}

export const customerService = {
  getCustomers: async (): Promise<Customer[]> => {
    const res = await customerRepository.getCustomers();
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  getCustomer: async (id: string): Promise<Customer | null> => {
    const res = await customerRepository.getCustomer(id);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  searchCustomers: async (query: string): Promise<Customer[]> => {
    if (!query.trim()) {
      const res = await customerRepository.getCustomers();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    }
    const res = await customerRepository.searchCustomers(query);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  createCustomer: async (customerData: Omit<Customer, 'id' | 'total_credit' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const res = await customerRepository.createCustomer(customerData);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  updateCustomer: async (id: string, updates: Partial<Omit<Customer, 'id' | 'total_credit' | 'created_at' | 'updated_at'>>): Promise<Customer> => {
    const res = await customerRepository.updateCustomer(id, updates);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const res = await customerRepository.deleteCustomer(id);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
  },


  addCredit: async (customerId: string, amount: number, business_date: string, reference?: string, notes?: string): Promise<CustomerTransaction> => {
    const res = await customerRepository.addTransaction(customerId, amount, business_date, 'credit', undefined, reference, notes);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: business_date } }));
    return res.data;
  },

  recordPayment: async (customerId: string, amount: number, paymentMethod: 'Cash' | 'UPI' | 'Bank', business_date: string, reference?: string, notes?: string): Promise<CustomerTransaction> => {
    // Validate if payment exceeds total credit
    const custRes = await customerRepository.getCustomer(customerId);
    if (!custRes.success) throw new Error(custRes.error.message);
    const customer = custRes.data;
    if (!customer) throw new Error('Customer not found');
    if (customer.total_credit - amount < 0) {
      throw new Error('Payment amount cannot exceed total credit');
    }
    
    const txRes = await customerRepository.addTransaction(customerId, amount, business_date, 'payment', paymentMethod, reference, notes);
    if (!txRes.success) throw new Error(txRes.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: business_date } }));
    return txRes.data;
  },

  getDailyCreditTotal: async (datePrefix: string): Promise<number> => {
    const res = await customerRepository.getDailyCreditTotals();
    if (!res.success) throw new Error(res.error.message);
    const totals = res.data;
    let sum = 0;
    for (const [date, amount] of Object.entries(totals)) {
      if (date.startsWith(datePrefix)) {
        sum += amount;
      }
    }
    return sum;
  },
  
  getAllDailyCreditTotals: async (): Promise<Record<string, number>> => {
    const res = await customerRepository.getDailyCreditTotals();
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  getCustomerTransactions: async (customerId: string): Promise<CustomerTransaction[]> => {
    const res = await customerRepository.getCustomerTransactions(customerId);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  getCustomerDueSince: async (customerId: string, totalOutstanding: number) => {
    const res = await customerRepository.getCustomerTransactions(customerId);
    if (!res.success) throw new Error(res.error.message);
    return calculateCustomerDueSince(res.data, totalOutstanding);
  },

  updateTransaction: async (
    transactionId: string,
    updates: { amount: number; notes?: string; payment_method?: 'Cash' | 'UPI' | 'Bank' }
  ): Promise<CustomerTransaction> => {
    const res = await customerRepository.updateTransaction(transactionId, updates);
    if (!res.success) throw new Error(res.error.message);
    const tx = res.data;
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: tx.business_date || tx.date } }));
    return tx;
  },

  deleteTransaction: async (transactionId: string, business_date?: string): Promise<void> => {
    const res = await customerRepository.deleteTransaction(transactionId);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: business_date || null } }));
  }
};
