import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { BusinessFundsTransaction } from '../../../types/businessFunds';

export const businessFundsExportProvider = {
  getExportData: async (filteredFunds: BusinessFundsTransaction[]): Promise<ExportData> => {
    if (!filteredFunds || filteredFunds.length === 0) {
      throw new Error('No data available to export.');
    }

    // 1. Fetch settings for metadata
    const settings = await settingsService.getSettings();

    // 2. Map columns
    const columns: ExportColumn[] = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Reason', dataKey: 'reason' },
      { header: 'Payment Method', dataKey: 'payment_method' },
      { header: 'Amount', dataKey: 'amount', isCurrency: true },
      { header: 'Notes', dataKey: 'notes' },
    ];

    // 3. Map rows and calculate totals
    let grandTotal = 0;

    const rows = filteredFunds.map(tx => {
      grandTotal += tx.amount || 0;

      let dateStr = '-';
      try {
        if (tx.business_date) {
          dateStr = format(parseISO(tx.business_date), 'dd MMM yyyy');
        }
      } catch (e) {
        dateStr = 'Invalid Date';
      }

      return {
        date: dateStr,
        type: tx.type || 'Injection',
        reason: tx.reason || '-',
        payment_method: tx.payment_method || '-',
        amount: tx.amount || 0,
        notes: tx.notes || '-',
      };
    });

    // 4. Return formatted ExportData
    return {
      title: 'Business Funds Report',
      filename: `Business_Funds_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        payment_method: 'TOTAL',
        amount: grandTotal
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Records': filteredFunds.length.toString(),
      }
    };
  }
};
