import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { stockService } from '../services/stock.service';
import { StockPurchase } from '../types/stock';

export function useStock(date?: string) {
  const fetchPurchases = useCallback(async () => {
    if (!date) return [];
    const all = await stockService.getPurchases();
    return all.filter(p => p.purchase_date === date);
  }, [date]);

  const { data: purchases, loading, mutate: refresh } = useQueryCache(
    date ? `stock-purchases-${date}` : null,
    fetchPurchases
  );

  const addPurchase = async (data: any) => {
    const res = await stockService.addPurchase(data);
    await refresh();
    return res;
  };

  const deletePurchase = async (id: string) => {
    await stockService.deletePurchase(id);
    await refresh();
  };

  return {
    purchases: purchases || [],
    loading,
    refresh,
    addPurchase,
    deletePurchase
  };
}
