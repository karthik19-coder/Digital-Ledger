import { DashboardData, Activity } from '../types/dashboard';
import { financialCalculationService } from './financialCalculation.service';
import { settingsRepository } from '../repositories/settings.repository';
import { salesRepository } from '../repositories/sales.repository';
import { expenseRepository } from '../repositories/expense.repository';
import { businessFundsRepository } from '../repositories/businessFunds.repository';
import { vendorRepository } from '../repositories/vendor.repository';
import { customerRepository } from '../repositories/customer.repository';
import { format } from 'date-fns';

export interface DashboardSummary {
  todaySales: number;
  cashBalance: number;
  upiBalance: number;
  customerCredit: number;
  vendorCredit: number;
  estimatedStockValue: number;
}

export const dashboardService = {
  getDailySummary: async (dateStr?: string): Promise<DashboardSummary> => {
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    
    // The Dashboard MUST consume financialCalculation.service.ts ONLY for calculations
    const [balances, daySummary] = await Promise.all([
      financialCalculationService.calculateBalances(targetDate),
      financialCalculationService.calculateDaySummary(targetDate)
    ]);

    return {
      todaySales: daySummary.sales.total,
      cashBalance: balances.expectedCash,
      upiBalance: balances.expectedUPI,
      customerCredit: balances.customerDue,
      vendorCredit: balances.vendorDue,
      estimatedStockValue: balances.estimatedStockValue
    };
  },

  getDashboardData: async (dateStr?: string): Promise<DashboardData> => {
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    
    // Fetch all raw data once
    const rawData = await financialCalculationService.fetchAllData(targetDate);
    const settings = rawData.settings;
    
    // Calculate summary using the pre-fetched raw data
    const balances = await financialCalculationService.calculateBalances(targetDate, rawData);
    const daySummary = await financialCalculationService.calculateDaySummary(targetDate, rawData);
    
    const shopName = settings.shop_name || 'Supermarket Digital Ledger';

    // Build recent activities directly from the pre-fetched raw data
    const activities: Activity[] = [];

    // 1. Sales
    rawData.sales.forEach(s => {
      if (s.cash_sales && s.cash_sales > 0) activities.push({ id: `sale-c-${s.id}`, title: 'Cash Sale', amount: s.cash_sales, type: 'sale', time: 'Today' });
      if (s.upi_sales && s.upi_sales > 0) activities.push({ id: `sale-u-${s.id}`, title: 'UPI Sale', amount: s.upi_sales, type: 'sale', time: 'Today' });
    });

    // 2. Expenses
    rawData.expenses.forEach(e => {
      activities.push({ id: `exp-${e.id}`, title: e.notes || 'Expense', amount: Number(e.amount), type: 'expense', time: 'Today' });
    });

    // 3. Business Funds
    rawData.businessFunds.forEach(f => {
      activities.push({ id: `fund-${f.id}`, title: f.notes || 'Business Funds Added', amount: Number(f.amount), type: 'funds', time: 'Today' });
    });
    
    // 4. Vendor tx
    rawData.vendorTx.forEach(v => {
      if (v.type === 'payment') activities.push({ id: `vpay-${v.id}`, title: 'Vendor Payment', amount: Number(v.amount), type: 'stock', time: 'Today' });
      if (v.type === 'purchase') activities.push({ id: `vcred-${v.id}`, title: 'Stock Purchase', amount: Number(v.amount), type: 'stock', time: 'Today' });
    });
    
    // 5. Customer tx
    rawData.customerTx.forEach(c => {
      if (c.type === 'payment') activities.push({ id: `cpay-${c.id}`, title: 'Customer Payment', amount: Number(c.amount), type: 'credit', time: 'Today' });
      if (c.type === 'credit') activities.push({ id: `ccred-${c.id}`, title: 'Credit Sale', amount: Number(c.amount), type: 'credit', time: 'Today' });
    });

    const recent_activity = activities.slice(0, 5);

    return {
      shop_name: shopName,
      summary: {
        todays_sales: daySummary.sales.total,
        cash_balance: balances.expectedCash,
        upi_balance: balances.expectedUPI,
        customer_credit_outstanding: balances.customerDue,
        vendor_credit_outstanding: balances.vendorDue,
        estimated_stock_value: balances.estimatedStockValue,
      },
      recent_activity
    };
  }
};
