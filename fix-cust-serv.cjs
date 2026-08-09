const fs = require('fs');
let content = fs.readFileSync('src/services/customer.service.ts', 'utf8');

const additionalMethods = `
  getDailyCreditTotal: async (datePrefix: string): Promise<number> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const txData = sessionStorage.getItem(TRANSACTIONS_KEY);
        if (!txData) return resolve(0);
        
        const transactions = JSON.parse(txData);
        const total = transactions
          .filter((t: any) => t.type === 'credit' && t.date.startsWith(datePrefix))
          .reduce((sum: number, t: any) => sum + t.amount, 0);
          
        resolve(total);
      }, 200);
    });
  },
  
  getAllDailyCreditTotals: async (): Promise<Record<string, number>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const txData = sessionStorage.getItem(TRANSACTIONS_KEY);
        if (!txData) return resolve({});
        
        const transactions = JSON.parse(txData);
        const totals: Record<string, number> = {};
        for (const t of transactions) {
          if (t.type === 'credit') {
            const dateStr = t.date.split('T')[0];
            totals[dateStr] = (totals[dateStr] || 0) + t.amount;
          }
        }
        resolve(totals);
      }, 200);
    });
  },
`;

content = content.replace('getCustomerTransactions: async', additionalMethods + '\n  getCustomerTransactions: async');

fs.writeFileSync('src/services/customer.service.ts', content);
