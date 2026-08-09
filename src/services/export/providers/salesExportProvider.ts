import { salesService } from '../../sales.service';
import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format } from 'date-fns';

export const salesExportProvider = {
  getDailySalesExportData: async (dateStr: string): Promise<ExportData> => {
    // 1. Fetch raw data
    const [transactions, settings] = await Promise.all([
      salesService.getTransactionsForDate(dateStr),
      settingsService.getSettings()
    ]);

    // 2. Map columns
    const columns: ExportColumn[] = [
      { header: 'Invoice / Ref', dataKey: 'reference_number' },
      { header: 'Time', dataKey: 'time' },
      { header: 'Cash Sales', dataKey: 'cash_sales', isCurrency: true },
      { header: 'UPI Sales', dataKey: 'upi_sales', isCurrency: true },
      { header: 'Credit Sales', dataKey: 'credit_sales', isCurrency: true },
      { header: 'Total Amount', dataKey: 'total_amount', isCurrency: true },
    ];

    // 3. Map rows and calculate totals
    let totalCash = 0;
    let totalUpi = 0;
    let totalCredit = 0;
    let grandTotal = 0;

    const rows = transactions.map(t => {
      const cash = t.cash_sales || 0;
      const upi = t.upi_sales || 0;
      const credit = t.credit_sales || 0;
      const total = cash + upi + credit;

      totalCash += cash;
      totalUpi += upi;
      totalCredit += credit;
      grandTotal += total;

      return {
        reference_number: t.reference_number || '-',
        time: format(new Date(t.created_at), 'hh:mm a'),
        cash_sales: cash,
        upi_sales: upi,
        credit_sales: credit,
        total_amount: total,
      };
    });

    // 4. Return formatted ExportData
    return {
      title: 'Daily Sales Report',
      filename: `Sales_Report_${dateStr}`,
      columns,
      rows,
      totals: {
        cash_sales: totalCash,
        upi_sales: totalUpi,
        credit_sales: totalCredit,
        total_amount: grandTotal
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Report Date': format(new Date(dateStr), 'dd MMM yyyy'),
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Transactions': transactions.length.toString(),
      }
    };
  }
};
