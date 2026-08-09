import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { salesService, SaleTransaction } from '../services/sales.service';

export function useSales(date: string) {
  const fetchSummary = useCallback(async () => {
    return salesService.getDailySummaryForDate(date);
  }, [date]);

  const { data: summary, loading: summaryLoading, mutate: refreshSummary } = useQueryCache(
    `sales-summary-${date}`,
    fetchSummary
  );

  const fetchTransactions = useCallback(async () => {
    return salesService.getTransactionsForDate(date);
  }, [date]);

  const { data: transactions, loading: txLoading, mutate: refreshTransactions } = useQueryCache(
    `sales-tx-${date}`,
    fetchTransactions
  );

  const addSale = async (data: Omit<SaleTransaction, 'id' | 'created_at'>) => {
    const res = await salesService.addSaleTransaction(data);
    await Promise.all([refreshSummary(), refreshTransactions()]);
    return res;
  };

  return {
    summary,
    transactions,
    loading: summaryLoading || txLoading,
    refresh: () => Promise.all([refreshSummary(), refreshTransactions()]),
    addSale
  };
}
