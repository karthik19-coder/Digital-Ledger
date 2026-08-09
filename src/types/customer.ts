export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  transaction_type: 'credit' | 'payment';
  payment_method?: 'cash' | 'upi';
  amount: number;
  reference_number?: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}
