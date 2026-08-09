import { Sale } from '../types/sales';
import { businessDayService } from './businessDay.service';
import { salesRepository } from '../repositories/sales.repository';

export interface SaleTransaction {
  id: string;
  sale_date: string;
  cash_sales: number;
  upi_sales: number;
  credit_sales?: number;
  customer_id?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface DailySaleSummary {
  cash_total: number;
  upi_total: number;
  credit_total: number;
  total: number;
  transaction_count: number;
}

export const salesService = {
  getTransactionsForDate: async (date: string): Promise<SaleTransaction[]> => {
    const res = await salesRepository.getSales();
    if (!res.success) throw new Error(res.error.message);
    const all = res.data;
    return all
      .filter(t => t.sale_date === date)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getDailySummaryForDate: async (date: string): Promise<DailySaleSummary> => {
    const transactions = await salesService.getTransactionsForDate(date);
    const summary = await businessDayService.recalculateBusinessDay(date);

    return {
      cash_total: summary.sales.cash,
      upi_total: summary.sales.upi,
      credit_total: summary.sales.credit,
      total: summary.sales.total,
      transaction_count: transactions.length,
    };
  },

  addSaleTransaction: async (data: {
    sale_date: string;
    cash_sales: number;
    upi_sales: number;
    credit_sales?: number;
    customer_id?: string;
    reference_number?: string;
    notes?: string;
  }): Promise<SaleTransaction> => {
    const res = await salesRepository.createSale(data);
    if (!res.success) throw new Error(res.error.message);
    
    // Removed mock storage sync

    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: data.sale_date } }));
    return res.data;
  },

  updateSaleTransaction: async (id: string, updates: Partial<SaleTransaction>): Promise<SaleTransaction> => {
    const res = await salesRepository.updateSale(id, updates);
    if (!res.success) throw new Error(res.error.message);
    
    // Removed mock storage sync

    const tx = res.data;
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: tx.sale_date } }));
    return tx;
  },

  clearSalesForDate: async (date: string): Promise<void> => {
    const res = await salesRepository.getSales();
    if (!res.success) throw new Error(res.error.message);
    const all = res.data.filter(t => t.sale_date === date);
    for (const tx of all) {
      await salesRepository.deleteSale(tx.id);
    }
    
    // Removed mock storage sync
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date } }));
  },

  // === Legacy-compatible methods used by dashboard.service.ts ===

  getSalesByDate: async (date: string): Promise<Sale | null> => {
    // Removed mock storage sync

    const transactions = await salesService.getTransactionsForDate(date);
    
    let cash = 0, upi = 0, credit = 0;
    for (const t of transactions) {
      cash += t.cash_sales;
      upi += t.upi_sales;
      credit += (t.credit_sales || 0);
    }
    
    if (credit === 0) {
      const { customerService } = await import('./customer.service');
      credit = await customerService.getDailyCreditTotal(date);
    }

    if (cash === 0 && upi === 0 && credit === 0) {
      return null;
    }

    return {
      id: `agg-${date}`,
      sale_date: date,
      cash_sales: cash,
      upi_sales: upi,
      credit_sales: credit,
      created_at: transactions[0]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  getAllSales: async (): Promise<Sale[]> => {
    // Removed mock storage sync

    const res = await salesRepository.getSales();
    if (!res.success) throw new Error(res.error.message);
    const transactions = res.data;

    // Group transactions by date
    const dateMap: Record<string, { cash: number; upi: number; credit: number; created_at: string }> = {};
    for (const t of transactions) {
      if (!dateMap[t.sale_date]) {
        dateMap[t.sale_date] = { cash: 0, upi: 0, credit: 0, created_at: t.created_at };
      }
      dateMap[t.sale_date].cash += t.cash_sales;
      dateMap[t.sale_date].upi += t.upi_sales;
      dateMap[t.sale_date].credit += (t.credit_sales || 0);
    }

    const { customerService } = await import('./customer.service');
    const creditTotals = await customerService.getAllDailyCreditTotals();

    const sales: Sale[] = [];
    const allDates = new Set([...Object.keys(dateMap), ...Object.keys(creditTotals)]);

    for (const date of allDates) {
      const cash = dateMap[date]?.cash || 0;
      const upi = dateMap[date]?.upi || 0;
      const credit = Math.max(dateMap[date]?.credit || 0, creditTotals[date] || 0);

      if (cash === 0 && upi === 0 && credit === 0) continue;

      sales.push({
        id: `agg-${date}`,
        sale_date: date,
        cash_sales: cash,
        upi_sales: upi,
        credit_sales: credit,
        created_at: dateMap[date]?.created_at || date,
        updated_at: new Date().toISOString(),
      });
    }

    sales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    return sales;
  },

  saveSale: async (saleData: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<Sale> => {
    const tx = await salesService.addSaleTransaction({
      sale_date: saleData.sale_date,
      cash_sales: saleData.cash_sales,
      upi_sales: saleData.upi_sales,
      credit_sales: saleData.credit_sales,
      reference_number: saleData.reference_number,
      notes: saleData.notes,
    });

    return {
      ...saleData,
      id: tx.id,
      created_at: tx.created_at,
      updated_at: tx.created_at,
    };
  },

  deleteSale: async (id: string): Promise<void> => {
    const txRes = await salesRepository.getSale(id);
    let date = null;
    if (txRes.success && txRes.data) {
      date = txRes.data.sale_date;
    }
    
    const res = await salesRepository.deleteSale(id);
    if (!res.success) throw new Error(res.error.message);
    
    // Removed mock storage sync

    if (date) {
      window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date } }));
    }
  }
};
