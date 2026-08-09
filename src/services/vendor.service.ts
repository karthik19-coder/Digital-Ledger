import { Vendor, VendorTransaction } from '../types/vendor';
import { calculateVendorDueSince } from '../utils/dueSince';
import { vendorRepository } from '../repositories/vendor.repository';

export const vendorService = {
  getVendors: async (): Promise<Vendor[]> => {
    const res = await vendorRepository.getVendors();
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  getVendorById: async (id: string): Promise<Vendor | null> => {
    const res = await vendorRepository.getVendor(id);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  searchVendors: async (query: string): Promise<Vendor[]> => {
    if (!query.trim()) {
      const res = await vendorRepository.getVendors();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    }
    const res = await vendorRepository.searchVendors(query);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  createVendor: async (vendorData: Omit<Vendor, 'id' | 'total_due' | 'created_at' | 'updated_at'>): Promise<Vendor> => {
    const res = await vendorRepository.createVendor(vendorData);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  updateVendor: async (id: string, updates: Partial<Omit<Vendor, 'id' | 'total_due' | 'created_at' | 'updated_at'>>): Promise<Vendor> => {
    const res = await vendorRepository.updateVendor(id, updates);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  deleteVendor: async (id: string): Promise<void> => {
    const res = await vendorRepository.deleteVendor(id);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
  },

  addPurchase: async (vendorId: string, amount: number, business_date: string, reference?: string, notes?: string): Promise<VendorTransaction> => {
    const res = await vendorRepository.addTransaction(vendorId, amount, business_date, 'purchase', undefined, reference, notes);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: business_date } }));
    return res.data;
  },

  recordPayment: async (vendorId: string, amount: number, paymentMethod: 'Cash' | 'UPI' | 'Bank', business_date: string, reference?: string, notes?: string): Promise<VendorTransaction> => {
    const vendorRes = await vendorRepository.getVendor(vendorId);
    if (!vendorRes.success) throw new Error(vendorRes.error.message);
    const vendor = vendorRes.data;
    if (!vendor) throw new Error('Vendor not found');
    
    if (vendor.total_due - amount < 0) {
      throw new Error('Payment amount cannot exceed total due');
    }
    
    const txRes = await vendorRepository.addTransaction(vendorId, amount, business_date, 'payment', paymentMethod, reference, notes);
    if (!txRes.success) throw new Error(txRes.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: business_date } }));
    return txRes.data;
  },

  getDailyVendorPayments: async (dateStr: string): Promise<{ cash: number; upi: number; bank: number; total: number }> => {
    const res = await vendorRepository.getDailyPaymentTotals();
    if (!res.success) throw new Error(res.error.message);
    
    const dayData = res.data.find(d => d.date === dateStr);
    if (dayData) {
      return { cash: dayData.cash, upi: dayData.upi, bank: dayData.bank, total: dayData.total };
    }
    return { cash: 0, upi: 0, bank: 0, total: 0 };
  },

  getVendorTransactions: async (vendorId: string): Promise<VendorTransaction[]> => {
    const res = await vendorRepository.getVendorTransactions(vendorId);
    if (!res.success) throw new Error(res.error.message);
    return res.data;
  },

  getVendorDueSince: async (vendorId: string, totalOutstanding: number) => {
    const transactions = await vendorService.getVendorTransactions(vendorId);
    return calculateVendorDueSince(transactions, totalOutstanding);
  },

  updateTransaction: async (
    transactionId: string,
    updates: { amount: number; notes?: string; payment_method?: 'Cash' | 'UPI' | 'Bank' }
  ): Promise<VendorTransaction> => {
    const res = await vendorRepository.updateTransaction(transactionId, updates);
    if (!res.success) throw new Error(res.error.message);
    const updatedTx = res.data;
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: updatedTx.business_date } }));
    return updatedTx;
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    const res = await vendorRepository.deleteTransaction(transactionId);
    if (!res.success) throw new Error(res.error.message);
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
  }
};
