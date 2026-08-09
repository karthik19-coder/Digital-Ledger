export interface Sale {
  id: string;
  sale_date: string;
  cash_sales: number;
  upi_sales: number;
  credit_sales: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
