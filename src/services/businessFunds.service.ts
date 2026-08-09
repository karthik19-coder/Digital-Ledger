import { BusinessFundsTransaction } from '../types/businessFunds';
import { businessFundsRepository } from '../repositories/businessFunds.repository';

export const businessFundsService = {
  getAllTransactions: async (): Promise<BusinessFundsTransaction[]> => {
    const res = await businessFundsRepository.getBusinessFunds();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch funds');
    return res.data || [];
  },

  getDailyFunds: async (dateStr: string): Promise<{ cash: number; upi: number; total: number }> => {
    const res = await businessFundsRepository.getBusinessFunds();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch funds');
    
    let cash = 0, upi = 0, total = 0;
    for (const tx of res.data || []) {
      if (tx.business_date === dateStr) {
        total += tx.amount;
        if (tx.payment_method === 'Cash') cash += tx.amount;
        if (tx.payment_method === 'UPI' || tx.payment_method === 'Bank') upi += tx.amount;
      }
    }
    return { cash, upi, total };
  },

  addFunds: async (amount: number, paymentMethod: 'Cash' | 'UPI' | 'Bank', businessDate: string, reason?: string, notes?: string): Promise<BusinessFundsTransaction> => {
    const res = await businessFundsRepository.createBusinessFund({
      amount,
      payment_method: paymentMethod,
      business_date: businessDate,
      reason,
      notes,
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to add fund');
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: businessDate } }));
    return res.data;
  },

  updateTransaction: async (
    transactionId: string,
    updates: { amount: number; payment_method: 'Cash' | 'UPI' | 'Bank'; business_date?: string; reason?: string; notes?: string }
  ): Promise<BusinessFundsTransaction> => {
    const res = await businessFundsRepository.updateBusinessFund(transactionId, updates);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update transaction');
    if (updates.business_date) {
      window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: updates.business_date } }));
    }
    return res.data;
  },

  deleteTransaction: async (transactionId: string, businessDate?: string): Promise<void> => {
    const res = await businessFundsRepository.deleteBusinessFund(transactionId);
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete transaction');
    if (businessDate) {
      window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: businessDate } }));
    } else {
      window.dispatchEvent(new CustomEvent('transaction-mutated'));
    }
  }
};
