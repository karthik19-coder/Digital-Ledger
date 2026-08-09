export interface BusinessFundsTransaction {
  id: string;
  business_date: string;
  created_at: string;
  updated_at: string;
  amount: number;
  type?: 'Injection' | 'Withdrawal';
  payment_method: 'Cash' | 'UPI' | 'Bank';
  reason?: string;
  notes?: string;
}
