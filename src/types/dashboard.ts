export interface DailySummary {
  todays_sales: number;
  cash_balance: number;
  upi_balance: number;
  customer_credit_outstanding: number;
  vendor_credit_outstanding: number;
  estimated_stock_value: number;
}

export interface Activity {
  id: string;
  title: string;
  amount: number;
  type: 'sale' | 'credit' | 'stock' | 'expense' | 'funds';
  time: string;
}

export interface DashboardData {
  shop_name: string;
  summary: DailySummary;
  recent_activity: Activity[];
}
