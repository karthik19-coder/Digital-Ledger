const fs = require('fs');

let content = fs.readFileSync('src/services/sales.service.ts', 'utf8');

content = content.replace("import { Sale } from '../types/sales';", "import { Sale } from '../types/sales';\nimport { customerService } from './customer.service';");

content = content.replace(/getSalesByDate: async[\s\S]*?getAllSales: async/m, `getSalesByDate: async (date: string): Promise<Sale | null> => {
    // TODO: Replace with Supabase
    return new Promise((resolve) => {
      setTimeout(async () => {
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
          sale = { id: 'temp', sale_date: date, cash_sales: 0, upi_sales: 0, credit_sales, created_at: '', updated_at: '' };
        }
        
        resolve(sale);
      }, 500);
    });
  },
  getAllSales: async`);

content = content.replace(/getAllSales: async[\s\S]*?saveSale: async/m, `getAllSales: async (): Promise<Sale[]> => {
    // TODO: Replace with Supabase
    return new Promise((resolve) => {
      setTimeout(async () => {
        const data = sessionStorage.getItem(STORAGE_KEY);
        let sales: Sale[] = data ? JSON.parse(data) : [];
        
        const creditTotals = await customerService.getAllDailyCreditTotals();
        
        // Update all sales with their credit totals
        for (const s of sales) {
          s.credit_sales = creditTotals[s.sale_date] || 0;
          delete creditTotals[s.sale_date];
        }
        
        // Add pseudo-sales for days that only have credit
        for (const [date, credit] of Object.entries(creditTotals)) {
          if (credit > 0) {
            sales.push({ id: \`credit-\${date}\`, sale_date: date, cash_sales: 0, upi_sales: 0, credit_sales: credit, created_at: date, updated_at: date });
          }
        }
        
        // Sort by newest first
        sales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
        resolve(sales);
      }, 500);
    });
  },
  saveSale: async`);

fs.writeFileSync('src/services/sales.service.ts', content);
