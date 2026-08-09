const fs = require('fs');

const content = `import { Sale } from '../types/sales';
import { customerService } from './customer.service';

const STORAGE_KEY = 'mock_sales';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const salesService = {
  getSalesByDate: async (date: string): Promise<Sale | null> => {
    // TODO: Replace with Supabase
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    
    const data = sessionStorage.getItem(STORAGE_KEY);
    let sale: Sale | null = null;
    if (data) {
      const sales: Sale[] = JSON.parse(data);
      sale = sales.find(s => s.sale_date === date) || null;
    }
    
    const credit_sales = await customerService.getDailyCreditTotal(date);
    
    if (sale) {
      sale.credit_sales = credit_sales;
    } else if (credit_sales > 0) {
      sale = { id: 'temp-' + date, sale_date: date, cash_sales: 0, upi_sales: 0, credit_sales, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    
    return sale;
  },

  getAllSales: async (): Promise<Sale[]> => {
    // TODO: Replace with Supabase
    await new Promise(r => setTimeout(r, 500));
    
    const data = sessionStorage.getItem(STORAGE_KEY);
    let sales: Sale[] = data ? JSON.parse(data) : [];
    
    const creditTotals = await customerService.getAllDailyCreditTotals();
    
    for (const s of sales) {
      s.credit_sales = creditTotals[s.sale_date] || 0;
      delete creditTotals[s.sale_date];
    }
    
    for (const [date, credit] of Object.entries(creditTotals)) {
      if (credit > 0) {
        sales.push({ id: \`credit-\${date}\`, sale_date: date, cash_sales: 0, upi_sales: 0, credit_sales: credit, created_at: date, updated_at: date });
      }
    }
    
    sales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    return sales;
  },

  saveSale: async (saleData: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<Sale> => {
    // TODO: Replace with Supabase
    await new Promise(r => setTimeout(r, 800));
    
    const data = sessionStorage.getItem(STORAGE_KEY);
    let sales: Sale[] = data ? JSON.parse(data) : [];
    
    const existingIndex = sales.findIndex(s => s.sale_date === saleData.sale_date);
    
    let savedSale: Sale;
    
    // We do NOT save credit_sales in the database.
    const toSave = { ...saleData };
    delete (toSave as any).credit_sales;

    if (existingIndex >= 0) {
      savedSale = {
        ...sales[existingIndex],
        ...toSave,
        updated_at: new Date().toISOString(),
      };
      sales[existingIndex] = savedSale;
    } else {
      savedSale = {
        ...toSave,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sales.push(savedSale);
    }
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    return savedSale;
  },

  deleteSale: async (id: string): Promise<void> => {
    // TODO: Replace with Supabase
    await new Promise(r => setTimeout(r, 800));
    
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) throw new Error('No sales data found');
    
    let sales: Sale[] = JSON.parse(data);
    sales = sales.filter(s => s.id !== id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }
};
`;

fs.writeFileSync('src/services/sales.service.ts', content);
