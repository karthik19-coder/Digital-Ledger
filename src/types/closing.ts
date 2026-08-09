export interface DailyClosing {
  date: string;
  sales: {
    cash: number;
    upi: number;
    credit: number;
    total: number;
  };
  expenses: {
    cash: number;
    upi: number;
    total: number;
    personalWithdrawals: number;
  };
  customerCollections: {
    cash: number;
    total: number;
  };
  vendorPayments: {
    cash: number;
    total: number;
  };
  businessFunds: {
    total: number;
  };
  estimatedStockValue: number;
  customerDue: number;
  vendorDue: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  closingNotes: string;
  status: 'Open' | 'Closed' | 'Unlocked';
  createdAt?: string;
  closedAt: string;
  lastUpdatedAt?: string;
}
