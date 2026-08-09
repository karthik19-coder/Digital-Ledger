import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { customerService, Customer, CustomerTransaction } from '../services/customer.service';

export function useCustomers() {
  const fetchCustomers = useCallback(async () => {
    return customerService.getCustomers();
  }, []);

  const { data: customers, loading, error, mutate: refresh } = useQueryCache(
    'customers-list',
    fetchCustomers
  );

  const getCustomer = async (id: string) => {
    return customerService.getCustomer(id);
  };

  const addCustomer = async (data: Omit<Customer, 'id' | 'total_credit' | 'created_at' | 'updated_at'>) => {
    const res = await customerService.createCustomer(data);
    await refresh();
    return res;
  };

  const recordPayment = async (id: string, amount: number, method: string, date: string, reference?: string, notes?: string) => {
    const res = await customerService.recordPayment(id, amount, method as any, date, reference, notes);
    await refresh();
    return res;
  };

  const addCredit = async (id: string, amount: number, date: string, reference?: string, notes?: string) => {
    const res = await customerService.addCredit(id, amount, date, reference, notes);
    await refresh();
    return res;
  };

  return {
    customers: customers || [],
    loading,
    error,
    refresh,
    getCustomer,
    addCustomer,
    recordPayment,
    addCredit
  };
}
