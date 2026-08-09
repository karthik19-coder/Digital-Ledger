export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  total_due: number;
  created_at: string;
  updated_at: string;
}

export interface VendorTransaction {
  id: string;
  vendor_id: string;
  business_date: string;
  created_at: string;
  updated_at: string;
  date?: string; // Kept for backward compatibility
  amount: number;
  type: 'purchase' | 'payment';
  payment_method?: 'Cash' | 'UPI' | 'Bank';
  reference?: string;
  reference_type?: string;
  notes?: string;
}
