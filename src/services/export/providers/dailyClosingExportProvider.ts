import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { DailyClosing } from '../../../types/closing';

export const dailyClosingExportProvider = {
  getExportData: async (data: DailyClosing, actualCashInput?: string): Promise<ExportData> => {
    if (!data) {
      throw new Error('No data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Metric', dataKey: 'metric' },
      { header: 'Amount', dataKey: 'amount', isCurrency: true },
    ];

    const actualCash = data.actualCash || (actualCashInput ? parseFloat(actualCashInput) : 0);
    const expectedCash = data.expectedCash || 0;
    const difference = actualCash - expectedCash;

    const rows = [
      { metric: 'Sales (Cash)', amount: data.sales?.cash || 0 },
      { metric: 'Sales (UPI)', amount: data.sales?.upi || 0 },
      { metric: 'Sales (Total)', amount: data.sales?.total || 0 },
      { metric: 'Expenses (Cash)', amount: data.expenses?.cash || 0 },
      { metric: 'Expenses (Total)', amount: data.expenses?.total || 0 },
      { metric: 'Customer Collections (Cash)', amount: data.customerCollections?.cash || 0 },
      { metric: 'Vendor Payments (Cash)', amount: data.vendorPayments?.cash || 0 },
      { metric: 'Business Funds', amount: data.businessFunds?.total || 0 },
      { metric: 'Expected Cash', amount: expectedCash },
      { metric: 'Actual Cash', amount: actualCash },
      { metric: 'Difference', amount: difference },
    ];

    let dateStr = '-';
    try {
      if (data.date) {
        dateStr = format(parseISO(data.date), 'dd MMM yyyy');
      }
    } catch (e) {
      dateStr = data.date;
    }

    return {
      title: 'Daily Closing Report',
      filename: `Closing_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      metadata: {
        'Store Name': settings.shop_name,
        'Closing Date': dateStr,
        'Status': data.status || 'Open',
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
      }
    };
  }
};
