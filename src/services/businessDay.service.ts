import { salesService } from './sales.service';
import { expenseService } from './expense.service';
import { customerService } from './customer.service';
import { settingsService } from './settings.service';
import { vendorService } from './vendor.service';
import { stockService } from './stock.service';
import { payrollService } from './payroll.service';
import { closingService } from './closing.service';
import { businessFundsService } from './businessFunds.service';
import { financialCalculationService } from './financialCalculation.service';
import { format, parseISO, compareDesc, isBefore } from 'date-fns';

export interface BusinessDaySummary {
  date: string;
  sales: {
    cash: number;
    upi: number;
    credit: number;
    total: number;
  };
  expenses: {
    cash: number;
    upi: number;
    total: number;
    personalWithdrawals: number;
    categoriesCash: Record<string, number>;
    categoriesUpi: Record<string, number>;
  };
  customers: {
    outstanding: number;
    collections: number;
    cashCollections: number;
    upiCollections: number;
  };
  vendors: {
    outstanding: number;
    payments: number;
    cashPayments: number;
    upiPayments: number;
  };
  stock: {
    purchases: number;
    estimatedStockValue: number;
  };
  employees: {
    salaryPaid: number;
    salaryCashPaid: number;
    salaryUpiPaid: number;
    salaryExpense: number; // For total salary expense generated
  };
  businessFunds: {
    cash: number;
    upi: number;
    total: number;
  };
  balances: {
    openingCash: number;
    openingUpi: number;
    expectedCash: number;
    expectedUpi: number;
  };
}

export const businessDayService = {
  /**
   * Recalculates all business metrics for a specific date.
   * This is the single source of truth for cross-module aggregations.
   * @param dateStr The date in 'yyyy-MM-dd' format.
   * @returns BusinessDaySummary for that date.
   */
  async recalculateBusinessDay(dateStr: string, prefetchedData?: any, persist: boolean = false): Promise<BusinessDaySummary> {
    // Fetch ALL data once (full tables needed for calculateBalances cumulative sums)
    const rawData = prefetchedData || await financialCalculationService.fetchAllData();
    
    const daySummary = await financialCalculationService.calculateDaySummary(dateStr, rawData);
    
    // Calculate opening balances exactly at the END of the PREVIOUS day
    // This gives us the opening balances for dateStr
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];
    
    // Both use shared rawData — no additional DB calls
    const openingBalances = await financialCalculationService.calculateBalances(prevDateStr, rawData);
    const closingBalances = await financialCalculationService.calculateBalances(dateStr, rawData);

    const summary: BusinessDaySummary = {
      date: dateStr,
      sales: daySummary.sales,
      expenses: daySummary.expenses,
      customers: {
        outstanding: closingBalances.customerDue, // Use closing balances for that day
        collections: daySummary.collections.total,
        cashCollections: daySummary.collections.cash,
        upiCollections: daySummary.collections.upi,
      },
      vendors: {
        outstanding: closingBalances.vendorDue,
        payments: daySummary.vendorPayments.total,
        cashPayments: daySummary.vendorPayments.cash,
        upiPayments: daySummary.vendorPayments.upi,
      },
      stock: {
        purchases: daySummary.stockPurchases.total,
        estimatedStockValue: closingBalances.estimatedStockValue,
      },
      employees: {
        salaryPaid: daySummary.payroll.total,
        salaryCashPaid: daySummary.payroll.cash,
        salaryUpiPaid: daySummary.payroll.upi,
        salaryExpense: closingBalances.salaryExpenses,
      },
      businessFunds: {
        cash: daySummary.businessFunds.cash,
        upi: daySummary.businessFunds.upi,
        total: daySummary.businessFunds.total,
      },
      balances: {
        openingCash: openingBalances.cashBalance,
        openingUpi: openingBalances.upiBalance,
        expectedCash: closingBalances.cashBalance,
        expectedUpi: closingBalances.upiBalance,
      }
    };

    // Cache the summary for the dashboard
    sessionStorage.setItem(`business_day_${dateStr}`, JSON.stringify(summary));

    // Only update Daily Closing if persistence is explicitly requested
    if (persist) {
      await closingService.updateClosingFromBusinessDay(dateStr, summary);
    }

    return summary;
  },

  /**
   * Returns a structured breakdown of how the Cash balance is calculated for a given date.
   * All values come from the single recalculateBusinessDay source of truth.
   */
  async getCashBreakdown(dateStr: string) {
    const s = await businessDayService.recalculateBusinessDay(dateStr);
    return {
      openingCash: s.balances.openingCash,
      moneyIn: {
        cashSales: s.sales.cash,
        customerCollections: s.customers.cashCollections,
        businessFunds: s.businessFunds.cash,
      },
      moneyOut: {
        expenses: s.expenses.cash,
        expenseCategories: s.expenses.categoriesCash,
        vendorPayments: s.vendors.cashPayments,
      },
      currentBalance: s.balances.expectedCash,
    };
  },

  /**
   * Returns a structured breakdown of how the UPI balance is calculated for a given date.
   * All values come from the single recalculateBusinessDay source of truth.
   */
  async getUpiBreakdown(dateStr: string) {
    const s = await businessDayService.recalculateBusinessDay(dateStr);
    return {
      openingUpi: s.balances.openingUpi,
      moneyIn: {
        upiSales: s.sales.upi,
        customerCollections: s.customers.upiCollections,
        businessFunds: s.businessFunds.upi,
      },
      moneyOut: {
        expenses: s.expenses.upi,
        expenseCategories: s.expenses.categoriesUpi,
        vendorPayments: s.vendors.upiPayments,
      },
      currentBalance: s.balances.expectedUpi,
    };
  },

  /**
   * Returns a structured breakdown of how the Customer Due balance is calculated for a given date.
   */
  async getCustomerDueBreakdown(dateStr: string) {
    // Fetch all data once and share across recalculate + calculateBalances
    const rawData = await financialCalculationService.fetchAllData();
    const s = await businessDayService.recalculateBusinessDay(dateStr, rawData);
    
    const todayCreditSales = s.sales.credit;
    const todayCollections = s.customers.collections;
    
    // Current outstanding is the single source of truth
    const currentOutstanding = s.customers.outstanding;
    
    // Derive opening outstanding for this day based on engine outputs
    // We can also just fetch opening balances from financialCalculationService directly
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];
    const openingBalances = await financialCalculationService.calculateBalances(prevDateStr, rawData);
    
    const openingOutstanding = openingBalances.customerDue;

    // Get customers with outstanding balance (current state)
    const allCustomers = await customerService.getCustomers();
    const customersWithBalance = allCustomers
      .filter(c => (c.total_credit || 0) > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        balance: c.total_credit || 0
      }))
      .sort((a, b) => b.balance - a.balance); // Highest due first

    return {
      openingOutstanding,
      todayCreditSales,
      todayCollections,
      manualAdjustments: 0, // Future ready
      currentOutstanding,
      customers: customersWithBalance,
    };
  },

  /**
   * Returns a structured breakdown of how the Vendor Due balance is calculated for a given date.
   */
  async getVendorDueBreakdown(dateStr: string) {
    // Fetch all data once and share across recalculate + calculateBalances
    const rawData = await financialCalculationService.fetchAllData();
    const s = await businessDayService.recalculateBusinessDay(dateStr, rawData);
    
    const stockPurchases = s.stock.purchases;
    const vendorPayments = s.vendors.payments;
    
    // Current due is the single source of truth
    const currentDue = s.vendors.outstanding;
    
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];
    const openingBalances = await financialCalculationService.calculateBalances(prevDateStr, rawData);
    
    const openingDue = openingBalances.vendorDue;

    // Get vendors with outstanding balance (current state)
    const allVendors = await vendorService.getVendors();
    const vendorsWithBalance = allVendors
      .filter(v => (v.total_due || 0) > 0)
      .map(v => ({
        id: v.id,
        name: v.name,
        balance: v.total_due || 0
      }))
      .sort((a, b) => b.balance - a.balance); // Highest due first

    return {
      openingDue,
      stockPurchases,
      vendorPayments,
      manualAdjustments: 0, // Future ready
      currentDue,
      vendorsWithBalance,
    };
  },
};
