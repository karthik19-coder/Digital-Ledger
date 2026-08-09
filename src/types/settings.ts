export interface Settings {
  id: number;
  shop_name: string;
  owner_name: string;
  password_hash: string;
  currency: string;
  timezone: string;
  opening_cash: number;
  opening_upi: number;
  opening_stock: number;
  opening_customer_due: number;
  opening_vendor_due: number;
  average_profit_margin: number;
  business_start_date: string;
  is_setup_complete: boolean;
  created_at: string;
  updated_at: string;
}
