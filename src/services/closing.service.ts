import { DailyClosing } from '../types/closing';
import { RepoResult } from '../repositories/sales.repository';
import { salesRepository } from '../repositories/sales.repository';
import { expenseRepository } from '../repositories/expense.repository';
import { customerRepository } from '../repositories/customer.repository';
import { vendorRepository } from '../repositories/vendor.repository';
import { businessDayService } from './businessDay.service';
import { financialCalculationService } from './financialCalculation.service';
import { format, isBefore, parseISO, compareDesc } from 'date-fns';

import { closingRepository } from '../repositories/closing.repository';

export const closingService = {
  getAllClosings: async (): Promise<DailyClosing[]> => {
    const res = await closingRepository.getDailyClosings();
    if (!res.success) return [];
    return (res.data || []) as DailyClosing[];
  },

  getClosingForDate: async (dateStr: string): Promise<DailyClosing | null> => {
    const res = await closingRepository.getDailyClosing(dateStr);
    if (!res.success || !res.data) return null;
    return res.data as DailyClosing;
  },

  saveClosing: async (closing: DailyClosing): Promise<void> => {
    const res = await closingRepository.createDailyClosing(closing);
    if (!res.success) {
      console.error('Failed to save daily closing:', res.error);
    }
  },

  // `summary` receives complex cross-module dependencies (BusinessDaySummary).
  // Kept as `any` to prevent cyclic import issues during DB write synchronization.
  updateClosingFromBusinessDay: async (dateStr: string, summary: any): Promise<void> => {
    let closing = await closingService.getClosingForDate(dateStr);
    const now = new Date().toISOString();

    if (closing?.status === 'Closed') {
      // Historical closed daily closings are audited immutable snapshots.
      // Do not overwrite closed records.
      return;
    }

    if (!closing) {
      closing = {
        date: dateStr,
        sales: summary.sales,
        expenses: { cash: summary.expenses.cash, upi: summary.expenses.upi, total: summary.expenses.total, personalWithdrawals: summary.expenses.personalWithdrawals },
        customerCollections: { cash: summary.customers.cashCollections, total: summary.customers.collections },
        vendorPayments: { cash: summary.vendors.cashPayments, total: summary.vendors.payments },
        businessFunds: { total: summary.businessFunds?.total || 0 },
        estimatedStockValue: summary.stock.estimatedStockValue,
        customerDue: summary.customers.outstanding,
        vendorDue: summary.vendors.outstanding,
        expectedCash: summary.balances.expectedCash,
        actualCash: summary.balances.expectedCash, // default to expected until manually closed
        difference: 0,
        closingNotes: '',
        status: 'Open',
        closedAt: '', // Not closed yet
        createdAt: now,
        lastUpdatedAt: now
      };
    } else {
      // Update existing record (retaining status and closedAt, and actualCash)
      closing = {
        ...closing,
        sales: summary.sales,
        expenses: { cash: summary.expenses.cash, upi: summary.expenses.upi, total: summary.expenses.total, personalWithdrawals: summary.expenses.personalWithdrawals },
        customerCollections: { cash: summary.customers.cashCollections, total: summary.customers.collections },
        vendorPayments: { cash: summary.vendors.cashPayments, total: summary.vendors.payments },
        businessFunds: { total: summary.businessFunds?.total || 0 },
        estimatedStockValue: summary.stock.estimatedStockValue,
        customerDue: summary.customers.outstanding,
        vendorDue: summary.vendors.outstanding,
        expectedCash: summary.balances.expectedCash,
        // recalculate difference since day is not closed
        difference: closing.actualCash - summary.balances.expectedCash,
        lastUpdatedAt: now
      };
    }

    await closingService.saveClosing(closing);
  },

  unlockDay: async (dateStr: string): Promise<void> => {
    const closing = await closingService.getClosingForDate(dateStr);
    if (closing) {
      closing.status = 'Unlocked';
      closing.closedAt = new Date().toISOString();
      await closingService.saveClosing(closing);
    }
  },

  isDayClosed: async (dateStr: string): Promise<boolean> => {
    const closing = await closingService.getClosingForDate(dateStr);
    return closing?.status === 'Closed';
  },

  /**
   * Calculates the Opening Cash for a given date.
   * 
   * Mode A (Mathematical - default):
   * Calculates exactly from financialCalculationService by summing all historical transactions.
   * 
   * Mode B (Audited Cash):
   * If useAuditedCash is true, it finds the most recent closed day and uses its actual audited cash.
   * Do not mix both approaches.
   */
  getOpeningCashForDate: async (dateStr: string, useAuditedCash = false): Promise<number> => {
    if (!useAuditedCash) {
      // Mode A: Mathematical
      const prevDateObj = new Date(dateStr);
      prevDateObj.setDate(prevDateObj.getDate() - 1);
      const prevDateStr = prevDateObj.toISOString().split('T')[0];
      const balances = await financialCalculationService.calculateBalances(prevDateStr);
      return balances.cashBalance;
    } else {
      // Mode B: Audited Cash
      const all = await closingService.getAllClosings();
      // Sort descending
      const sorted = all.sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));
      // Find most recent closed day before dateStr
      const prevClosed = sorted.find(c => c.status === 'Closed' && isBefore(parseISO(c.date), parseISO(dateStr)));
      
      if (prevClosed) {
        return prevClosed.actualCash;
      }
      
      // If no previous Daily Closing exists, check initial setup
      const balances = await financialCalculationService.calculateBalances(dateStr); // Just to get opening setup if needed, but returning 0 is safer for pure audit flow.
      return 0;
    }
  },

  /**
   * Invalidates cached Daily Closing snapshots and forces a recalculation from the engine.
   * If a date is provided, recalculates that day and all subsequent days.
   * If no date is provided, recalculates all time (useful for settings changes).
   */
  invalidateAndRecalculateFromDate: async (dateStr?: string): Promise<void> => {
    const all = await closingService.getAllClosings();
    
    // Sort ascending to recalculate sequentially from oldest to newest affected
    const sorted = all.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    
    const affected = dateStr 
      ? sorted.filter(c => c.date >= dateStr) 
      : sorted;

    for (const c of affected) {
      // Invalidate session cache and recompute in-memory state without modifying persisted daily closings
      await businessDayService.recalculateBusinessDay(c.date);
    }

    // Inform the UI that a massive architectural shift just occurred
    window.dispatchEvent(new Event('financial-data-updated'));
  },

  getCalculatedDataForDate: async (dateStr: string) => {
    const summary = await businessDayService.recalculateBusinessDay(dateStr);
    
    // Convert BusinessDaySummary to the format expected by DailyClosing component
    return {
      sales: summary.sales,
      expenses: { 
        cash: summary.expenses.cash, 
        upi: summary.expenses.upi,
        total: summary.expenses.total,
        personalWithdrawals: summary.expenses.personalWithdrawals 
      },
      customerCollections: { cash: summary.customers.cashCollections, total: summary.customers.collections },
      vendorPayments: { cash: summary.vendors.cashPayments, total: summary.vendors.payments },
      businessFunds: { total: summary.businessFunds?.total || 0 },
      estimatedStockValue: summary.stock.estimatedStockValue,
      customerDue: summary.customers.outstanding,
      vendorDue: summary.vendors.outstanding,
      expectedCash: summary.balances.expectedCash,
    };
  },

  getPendingPreviousDay: async (todayStr: string): Promise<string | null> => {
    const datesWithActivity = new Set<string>();

    const addDate = (d?: string) => {
      if (d && d.length >= 10) datesWithActivity.add(d.substring(0, 10));
    };

    const rawData = await financialCalculationService.fetchAllData();
    rawData.sales.forEach(t => addDate(t.sale_date));
    rawData.expenses.forEach(t => addDate(t.expense_date));
    rawData.customerTx.forEach(t => addDate(t.business_date));
    rawData.vendorTx.forEach(t => addDate(t.business_date));

    // Filter dates < todayStr
    const prevDates = Array.from(datesWithActivity).filter(d => isBefore(parseISO(d), parseISO(todayStr)));
    
    // Sort descending (most recent first)
    prevDates.sort((a, b) => compareDesc(parseISO(a), parseISO(b)));

    const allClosings = await closingService.getAllClosings();
    
    for (const dateStr of prevDates) {
      const closing = allClosings.find(c => c.date === dateStr);
      if (!closing || closing.status !== 'Closed') {
        return dateStr;
      }
    }

    return null;
  }
};
