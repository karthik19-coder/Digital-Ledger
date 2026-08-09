import { settingsService } from './settings.service';
import { Settings } from '../types/settings';
import { salesRepository } from '../repositories/sales.repository';
import { customerRepository } from '../repositories/customer.repository';
import { vendorRepository } from '../repositories/vendor.repository';
import { expenseRepository } from '../repositories/expense.repository';
import { businessFundsRepository } from '../repositories/businessFunds.repository';
import { salaryRepository } from '../repositories/salary.repository';

export interface FinancialBalances {
  cashBalance: number;
  upiBalance: number;
  customerDue: number;
  vendorDue: number;
  expectedCash: number;
  expectedUPI: number;
  cashSales: number;
  upiSales: number;
  creditSales: number;
  customerCollections: number;
  vendorPayments: number;
  salaryPayments: number;
  businessFundsCash: number;
  businessFundsUPI: number;
  businessExpenses: number;
  salaryExpenses: number;
  totalExpenses: number;
  openingInventoryValue: number;
  inventoryPurchases: number;
  estimatedCOGS: number;
  estimatedStockValue: number;
  averageProfitMargin: number;
  totalSales: number;
  grossRevenue: number;
  netCashFlow: number;
}

export interface DaySummary {
  sales: { cash: number; upi: number; credit: number; total: number };
  expenses: { cash: number; upi: number; total: number; personalWithdrawals: number; categoriesCash: Record<string, number>; categoriesUpi: Record<string, number> };
  collections: { cash: number; upi: number; total: number };
  vendorPayments: { cash: number; upi: number; total: number };
  stockPurchases: { total: number };
  payroll: { cash: number; upi: number; total: number };
  businessFunds: { cash: number; upi: number; total: number };
}

export const financialCalculationService = {
  /**
   * Fetches all financial data in parallel from repositories.
   * When dateStr is provided, repositories fetch ONLY rows for that specific business date.
   * When dateStr is omitted, repositories fetch ALL rows (for cumulative calculations).
   */
  async fetchAllData(dateStr?: string) {
    const [settings, salesRes, custTxRes, expRes, vendTxRes, payrollRes, fundsRes] = await Promise.all([
      settingsService.getSettings(),
      salesRepository.getSales(dateStr),
      customerRepository.getAllCustomerTransactions(dateStr),
      expenseRepository.getExpenses(dateStr),
      vendorRepository.getAllVendorTransactions(dateStr),
      salaryRepository.getSalaryPayments(dateStr),
      businessFundsRepository.getBusinessFunds(dateStr),
    ]);

    return {
      settings,
      sales: salesRes.success ? salesRes.data : [],
      customerTx: (custTxRes.success && custTxRes.data) ? custTxRes.data : [],
      expenses: (expRes.success && expRes.data) ? expRes.data : [],
      vendorTx: (vendTxRes.success && vendTxRes.data) ? vendTxRes.data : [],
      salaryPayments: (payrollRes.success && payrollRes.data) ? payrollRes.data : [],
      businessFunds: (fundsRes.success && fundsRes.data) ? fundsRes.data : [],
    };
  },

  /**
   * Calculates the balances across the entire application up to a given date (or all-time if not provided).
   * This is the mathematical engine of the application.
   * ALWAYS requires full table data (cumulative sums from business_start_date to targetDate).
   */
  // prefetchedData receives highly dynamic caching payloads.
  // Enforcing strict types here breaks `useQueryCache` generic constraints.
  async calculateBalances(targetDateStr?: string, prefetchedData?: any): Promise<FinancialBalances> {
    // Use pre-fetched data if available, otherwise fetch ALL rows (no date filter)
    const rawData = prefetchedData || await financialCalculationService.fetchAllData();
    const settings = rawData.settings;
    const startDate = settings.business_start_date || '1970-01-01';

    let cashSales = 0;
    let upiSales = 0;
    let creditSales = 0;
    let totalSales = 0;
    
    let customerCollectionsCash = 0;
    let customerCollectionsUpi = 0;
    
    let vendorPaymentsCash = 0;
    let vendorPaymentsUpi = 0;
    let inventoryPurchases = 0;
    
    let salaryPaymentsCash = 0;
    let salaryPaymentsUpi = 0;
    let salaryExpenses = 0; // We will treat salary paid as expense for now based on previous code. Or separate?
    
    let businessFundsCash = 0;
    let businessFundsUPI = 0;
    
    let businessExpensesCash = 0;
    let businessExpensesUpi = 0;

    // Helper to determine if a transaction should be included
    const isIncluded = (date: string) => {
      // Must be after or equal to business_start_date
      if (date < startDate) return false;
      // If targetDate is specified, must be before or equal to targetDate
      if (targetDateStr && date > targetDateStr) return false;
      return true;
    };

    // 1. Sales
    for (const sale of rawData.sales) {
      const d = sale.sale_date;
      if (isIncluded(d)) {
        cashSales += (sale.cash_sales || 0);
        upiSales += (sale.upi_sales || 0);
        creditSales += (sale.credit_sales || 0);
      }
    }

    // 2. Customer Transactions (Credit Sales & Collections)
    for (const tx of rawData.customerTx) {
      const d = tx.business_date;
      if (isIncluded(d)) {
        if (tx.type === 'credit') {
          creditSales += (tx.amount || 0); // Some credit sales are in transactions
        } else if (tx.type === 'payment') {
          if (tx.payment_method === 'Cash') customerCollectionsCash += (tx.amount || 0);
          if (tx.payment_method === 'UPI') customerCollectionsUpi += (tx.amount || 0);
        }
      }
    }
    totalSales = cashSales + upiSales + creditSales;

    // 3. Expenses
    for (const exp of rawData.expenses) {
      const d = exp.expense_date;
      if (isIncluded(d)) {
        if (exp.payment_method === 'Cash') businessExpensesCash += (exp.amount || 0);
        if (exp.payment_method === 'UPI') businessExpensesUpi += (exp.amount || 0);
      }
    }

    // 4. Vendor Transactions
    for (const tx of rawData.vendorTx) {
      const d = tx.business_date;
      if (isIncluded(d)) {
        if (tx.type === 'purchase') {
          inventoryPurchases += (tx.amount || 0);
        } else if (tx.type === 'payment') {
          if (tx.payment_method === 'Cash') vendorPaymentsCash += (tx.amount || 0);
          if (tx.payment_method === 'UPI') vendorPaymentsUpi += (tx.amount || 0);
        }
      }
    }

    // 5. Payroll
    for (const p of rawData.salaryPayments) {
      if (isIncluded(p.payment_date)) {
        if (p.payment_method === 'Cash') salaryPaymentsCash += (p.amount || 0);
        if (p.payment_method === 'UPI') salaryPaymentsUpi += (p.amount || 0);
      }
    }
    salaryExpenses = salaryPaymentsCash + salaryPaymentsUpi; // Assuming all salary payments are expenses

    // 6. Business Funds
    for (const f of rawData.businessFunds) {
      if (isIncluded(f.business_date)) {
        // If amount is positive and type is Injection, add. If type is Withdrawal, subtract.
        const sign = f.type === 'Withdrawal' ? -1 : 1;
        const adjustedAmount = (f.amount || 0) * sign;
        if (f.payment_method === 'Cash') businessFundsCash += adjustedAmount;
        if (f.payment_method === 'UPI') businessFundsUPI += adjustedAmount;
      }
    }

    // 7. Calculate Derived Values
    const customerCollections = customerCollectionsCash + customerCollectionsUpi;
    const vendorPayments = vendorPaymentsCash + vendorPaymentsUpi;
    const salaryPayments = salaryPaymentsCash + salaryPaymentsUpi;
    const businessExpenses = businessExpensesCash + businessExpensesUpi;
    const totalExpenses = businessExpenses + salaryExpenses;

    // Balances
    const customerDue = Math.max(0, (settings.opening_customer_due || 0) + creditSales - customerCollections);
    const vendorDue = Math.max(0, (settings.opening_vendor_due || 0) + inventoryPurchases - vendorPayments);
    
    const openingCash = settings.opening_cash || 0;
    const openingUPI = settings.opening_upi || 0;
    
    // We treat expectedCash exactly as cashBalance to avoid confusion, 
    // unless closing Service has a different historical audited amount.
    // The engine's job is pure math:
    const cashBalance = openingCash 
                      + cashSales 
                      + customerCollectionsCash 
                      + businessFundsCash 
                      - businessExpensesCash 
                      - vendorPaymentsCash 
                      - salaryPaymentsCash;

    const upiBalance = openingUPI 
                     + upiSales 
                     + customerCollectionsUpi 
                     + businessFundsUPI 
                     - businessExpensesUpi 
                     - vendorPaymentsUpi 
                     - salaryPaymentsUpi;

    const expectedCash = cashBalance;
    const expectedUPI = upiBalance;

    // Inventory Value
    const averageProfitMargin = settings.average_profit_margin || 15;
    const openingInventoryValue = settings.opening_stock || 0;
    const estimatedCOGS = (totalSales * (100 - averageProfitMargin)) / 100;
    
    let estimatedStockValue = openingInventoryValue + inventoryPurchases - estimatedCOGS;
    if (estimatedStockValue < 0) estimatedStockValue = 0; // Floor at 0

    // Overall metrics
    const grossRevenue = totalSales; // Simplified
    const netCashFlow = cashBalance + upiBalance - openingCash - openingUPI;

    return {
      cashBalance,
      upiBalance,
      customerDue,
      vendorDue,
      expectedCash,
      expectedUPI,
      cashSales,
      upiSales,
      creditSales,
      customerCollections,
      vendorPayments,
      salaryPayments,
      businessFundsCash,
      businessFundsUPI,
      businessExpenses,
      salaryExpenses,
      totalExpenses,
      openingInventoryValue,
      inventoryPurchases,
      estimatedCOGS,
      estimatedStockValue,
      averageProfitMargin,
      totalSales,
      grossRevenue,
      netCashFlow
    };
  },

  /**
   * Summarizes all transactions for a specific single day.
   * When called without prefetchedData, fetches ONLY the target date's rows from the DB.
   * When called with prefetchedData (full tables), filters in-memory.
   */
  // prefetchedData receives highly dynamic caching payloads.
  // Enforcing strict types here breaks `useQueryCache` generic constraints.
  async calculateDaySummary(dateStr: string, prefetchedData?: any): Promise<DaySummary> {
    // If no pre-fetched data, fetch ONLY the target date's data (date-filtered queries)
    const rawData = prefetchedData || await financialCalculationService.fetchAllData(dateStr);

    const summary: DaySummary = {
      sales: { cash: 0, upi: 0, credit: 0, total: 0 },
      expenses: { cash: 0, upi: 0, total: 0, personalWithdrawals: 0, categoriesCash: {}, categoriesUpi: {} },
      collections: { cash: 0, upi: 0, total: 0 },
      vendorPayments: { cash: 0, upi: 0, total: 0 },
      stockPurchases: { total: 0 },
      payroll: { cash: 0, upi: 0, total: 0 },
      businessFunds: { cash: 0, upi: 0, total: 0 }
    };

    // 1. Sales
    for (const sale of rawData.sales) {
      if (sale.sale_date === dateStr) {
        summary.sales.cash += (sale.cash_sales || 0);
        summary.sales.upi += (sale.upi_sales || 0);
      }
    }

    // 2. Customer Tx (Credit Sales + Collections)
    for (const tx of rawData.customerTx) {
      const d = tx.business_date;
      if (d === dateStr) {
        if (tx.type === 'credit') {
          summary.sales.credit += (tx.amount || 0);
        } else if (tx.type === 'payment') {
          summary.collections.total += (tx.amount || 0);
          if (tx.payment_method === 'Cash') summary.collections.cash += (tx.amount || 0);
          if (tx.payment_method === 'UPI') summary.collections.upi += (tx.amount || 0);
        }
      }
    }
    summary.sales.total = summary.sales.cash + summary.sales.upi + summary.sales.credit;

    // 3. Expenses
    for (const exp of rawData.expenses) {
      const d = exp.expense_date;
      if (d === dateStr) {
        if (exp.expense_type === 'personal') {
          summary.expenses.personalWithdrawals += (exp.amount || 0);
        } else {
          summary.expenses.total += (exp.amount || 0);
          const cat = exp.category || 'Other';
          if (exp.payment_method === 'Cash') {
            summary.expenses.cash += (exp.amount || 0);
            summary.expenses.categoriesCash[cat] = (summary.expenses.categoriesCash[cat] || 0) + (exp.amount || 0);
          }
          if (exp.payment_method === 'UPI') {
            summary.expenses.upi += (exp.amount || 0);
            summary.expenses.categoriesUpi[cat] = (summary.expenses.categoriesUpi[cat] || 0) + (exp.amount || 0);
          }
        }
      }
    }

    // 4. Vendor Tx
    for (const tx of rawData.vendorTx) {
      const d = tx.business_date;
      if (d === dateStr) {
        if (tx.type === 'purchase') {
          summary.stockPurchases.total += (tx.amount || 0);
        } else if (tx.type === 'payment') {
          summary.vendorPayments.total += (tx.amount || 0);
          if (tx.payment_method === 'Cash') summary.vendorPayments.cash += (tx.amount || 0);
          if (tx.payment_method === 'UPI') summary.vendorPayments.upi += (tx.amount || 0);
        }
      }
    }

    // 5. Payroll
    for (const p of rawData.salaryPayments) {
      if (p.payment_date === dateStr) {
        summary.payroll.total += (p.amount || 0);
        if (p.payment_method === 'Cash') summary.payroll.cash += (p.amount || 0);
        if (p.payment_method === 'UPI') summary.payroll.upi += (p.amount || 0);
      }
    }

    // 6. Business Funds
    for (const f of rawData.businessFunds) {
      if (f.business_date === dateStr) {
        const sign = f.type === 'Withdrawal' ? -1 : 1;
        const adjustedAmount = (f.amount || 0) * sign;
        summary.businessFunds.total += adjustedAmount;
        if (f.payment_method === 'Cash') summary.businessFunds.cash += adjustedAmount;
        if (f.payment_method === 'UPI') summary.businessFunds.upi += adjustedAmount;
      }
    }

    return summary;
  }
};
