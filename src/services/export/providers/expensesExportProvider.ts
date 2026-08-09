import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format } from 'date-fns';
import { Expense } from '../../../types/expense';

export const expensesExportProvider = {
  getExportData: async (filteredExpenses: Expense[]): Promise<ExportData> => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      throw new Error('No data available to export.');
    }

    // 1. Fetch settings for metadata
    const settings = await settingsService.getSettings();

    // 2. Map columns
    const columns: ExportColumn[] = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Payment Method', dataKey: 'payment_method' },
      { header: 'Reference', dataKey: 'reference' },
      { header: 'Amount', dataKey: 'amount', isCurrency: true },
      { header: 'Notes', dataKey: 'notes' },
    ];

    // 3. Map rows and calculate totals
    let grandTotal = 0;

    const rows = filteredExpenses.map(e => {
      grandTotal += e.amount || 0;

      return {
        date: e.expense_date ? format(new Date(e.expense_date), 'dd MMM yyyy') : '-',
        category: e.category || '-',
        type: e.expense_type === 'personal' ? 'Personal' : 'Business',
        payment_method: e.payment_method || '-',
        reference: e.reference_number || '-',
        amount: e.amount || 0,
        notes: e.notes || '-',
      };
    });

    // 4. Return formatted ExportData
    return {
      title: 'Expenses Report',
      filename: `Expenses_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        category: 'TOTAL',
        amount: grandTotal
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Records': filteredExpenses.length.toString(),
      }
    };
  }
};
