const fs = require('fs');

const content = `import { DashboardData } from '../types/dashboard';
import { salesService } from './sales.service';
import { customerService } from './customer.service';
import { format } from 'date-fns';

export interface DashboardSummary {
  todaySales: number;
  cashBalance: number;
  upiBalance: number;
  customerCredit: number;
}

export const dashboardService = {
  getDailySummary: async (): Promise<DashboardSummary> => {
    // TODO: Replace with Supabase queries
    const sales = await salesService.getAllSales();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let todaySales = 0;
    let cashBalance = 0;
    let upiBalance = 0;
    
    // We already have credit_sales injected into 'sales' by getAllSales()
    for (const sale of sales) {
      if (sale.sale_date === todayStr) {
        todaySales += (sale.cash_sales || 0) + (sale.upi_sales || 0) + (sale.credit_sales || 0);
      }
      cashBalance += (sale.cash_sales || 0);
      upiBalance += (sale.upi_sales || 0);
    }

    // Get all-time outstanding customer credit
    let customerCredit = 0;
    const customers = await customerService.getCustomers();
    for (const c of customers) {
      customerCredit += c.total_credit || 0;
    }

    return {
      todaySales,
      cashBalance,
      upiBalance,
      customerCredit,
    };
  },

  getDashboardData: async (): Promise<DashboardData> => {
    const summaryData = await dashboardService.getDailySummary();
    
    // Mock implementation for UI development
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          shop_name: 'Supermarket Digital Ledger',
          summary: {
            todays_sales: summaryData.todaySales,
            cash_balance: summaryData.cashBalance,
            upi_balance: summaryData.upiBalance,
            customer_credit_outstanding: summaryData.customerCredit,
            vendor_credit_outstanding: 12000,
            estimated_stock_value: 250000,
          },
          recent_activity: [
            { id: '1', title: 'Sale to Customer', amount: 1200, type: 'sale', time: '10:45 AM' },
            { id: '2', title: 'Payment from Ramesh', amount: 5000, type: 'credit', time: '09:30 AM' },
            { id: '3', title: 'Stock Purchase', amount: 8500, type: 'stock', time: 'Yesterday' },
            { id: '4', title: 'Electricity Bill', amount: 1500, type: 'expense', time: 'Yesterday' },
            { id: '5', title: 'Sale to Customer', amount: 450, type: 'sale', time: 'Yesterday' },
          ]
        });
      }, 500);
    });
  },
};
`;

fs.writeFileSync('src/services/dashboard.service.ts', content);
