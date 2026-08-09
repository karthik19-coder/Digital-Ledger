export interface StockPurchase {
  id: string;
  vendor_id: string;
  invoice_number?: string;
  purchase_date: string;
  purchase_amount: number;
  payment_type: 'paid' | 'partial' | 'credit';
  paid_amount: number;
  payment_method?: 'Cash' | 'UPI' | 'Bank';
  notes?: string;
  created_at: string;
  vendor_purchase_tx_id?: string;
  vendor_payment_tx_id?: string;
}
