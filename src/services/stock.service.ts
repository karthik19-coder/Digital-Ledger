import { StockPurchase } from '../types/stock';
import { settingsService } from './settings.service';
import { financialCalculationService } from './financialCalculation.service';
import { stockRepository } from '../repositories/stock.repository';

const generateId = () => Math.random().toString(36).substring(2, 9);

export interface StockOverviewData {
  openingStock: number;
  totalPurchases: number;
  estimatedCogs: number;
  estimatedStockValue: number;
  currentVendorDue: number;
  averageProfitMargin: number;
}

export const stockService = {
  addPurchase: async (purchaseData: {
    vendor_id: string;
    invoice_number?: string;
    purchase_date: string;
    purchase_amount: number;
    payment_type: 'paid' | 'partial' | 'credit';
    paid_amount: number;
    payment_method?: 'Cash' | 'UPI' | 'Bank';
    notes?: string;
  }): Promise<StockPurchase> => {
    const res = await stockRepository.createPurchase(purchaseData);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to create purchase');
    return res.data;
  },

  getPurchases: async (): Promise<StockPurchase[]> => {
    const res = await stockRepository.getPurchases();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch purchases');
    return res.data || [];
  },

  getPurchase: async (purchaseId: string): Promise<StockPurchase> => {
    const res = await stockRepository.getPurchase(purchaseId);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Purchase not found');
    return res.data;
  },

  updatePurchase: async (
    purchaseId: string,
    updatedData: {
      vendor_id: string;
      invoice_number?: string;
      purchase_date: string;
      purchase_amount: number;
      payment_type: 'paid' | 'partial' | 'credit';
      paid_amount: number;
      payment_method?: 'Cash' | 'UPI' | 'Bank';
      notes?: string;
    }
  ): Promise<StockPurchase> => {
    const res = await stockRepository.updatePurchase(purchaseId, updatedData);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update purchase');
    return res.data;
  },

  deletePurchase: async (purchaseId: string): Promise<void> => {
    const res = await stockRepository.deletePurchase(purchaseId);
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete purchase');
  },

  getStockOverview: async (): Promise<StockOverviewData> => {
    const settings = await settingsService.getSettings();
    const balances = await financialCalculationService.calculateBalances();
    // Assuming today's summary could give us purchases? No, calculateBalances handles all historical.
    // Wait, the new getStockOverview needs totalPurchases and estimatedCogs which we don't return directly from calculateBalances.
    // Let's grab totalPurchases and estimatedCogs by pulling totalSales and totalPurchases from the calculateBalances logic?
    // Actually, calculateBalances doesn't return totalSales or totalPurchases. 
    // We should compute them or just read them.
    // Let's implement it cleanly here by using calculateDaySummary across all days or just doing what calculateBalances does.
    // To avoid duplication, I will update getStockOverview to use financialCalculationService.
    
    const openingStock = settings.opening_stock;
    const averageProfitMargin = settings.average_profit_margin;
    
    return {
      openingStock,
      totalPurchases: balances.inventoryPurchases,
      estimatedCogs: balances.estimatedCOGS,
      estimatedStockValue: balances.estimatedStockValue,
      currentVendorDue: balances.vendorDue,
      averageProfitMargin: balances.averageProfitMargin,
    };
  },

  getStockValueBreakdown: async (dateStr: string) => {
    const settings = await settingsService.getSettings();
    const startDate = settings.business_start_date || '1970-01-01';
    const averageProfitMargin = settings.average_profit_margin;

    const daySummary = await financialCalculationService.calculateDaySummary(dateStr);
    
    // Calculate opening balances exactly at the END of the PREVIOUS day
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];
    
    const openingBalances = await financialCalculationService.calculateBalances(prevDateStr);
    const closingBalances = await financialCalculationService.calculateBalances(dateStr);

    const todaySales = daySummary.sales.total;
    const todayPurchases = daySummary.stockPurchases.total;
    const estimatedCogs = todaySales * (100 - averageProfitMargin) / 100;

    return {
      currentStockValue: closingBalances.estimatedStockValue,
      openingStockValue: openingBalances.estimatedStockValue,
      todayPurchases,
      estimatedCogs,
      averageProfitMargin,
      todaySales,
    };
  },
};
