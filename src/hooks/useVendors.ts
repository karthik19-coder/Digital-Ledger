import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { vendorService } from '../services/vendor.service';
import { Vendor, VendorTransaction } from '../types/vendor';

export function useVendors() {
  const fetchVendors = useCallback(async () => {
    return vendorService.getVendors();
  }, []);

  const { data: vendors, loading, error, mutate: refresh } = useQueryCache(
    'vendors-list',
    fetchVendors
  );

  const getVendor = async (id: string) => {
    return vendorService.getVendorById(id);
  };

  const addVendor = async (data: any) => {
    const res = await vendorService.createVendor(data);
    await refresh();
    return res;
  };

  const recordPayment = async (id: string, amount: number, method: string, date: string, reference?: string, notes?: string) => {
    const res = await vendorService.recordPayment(id, amount, method as any, date, reference, notes);
    await refresh();
    return res;
  };

  const addPurchase = async (id: string, amount: number, date: string, reference?: string, notes?: string) => {
    const res = await vendorService.addPurchase(id, amount, date, reference, notes);
    await refresh();
    return res;
  };

  return {
    vendors: vendors || [],
    loading,
    error,
    refresh,
    getVendor,
    addVendor,
    recordPayment,
    addPurchase
  };
}
