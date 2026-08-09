import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { StockPurchase } from '../../../types/stock';

export const stockExportProvider = {
  getExportData: async (filteredPurchases: StockPurchase[], vendorsMap: Record<string, string>): Promise<ExportData> => {
    if (!filteredPurchases || filteredPurchases.length === 0) {
      throw new Error('No data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Vendor', dataKey: 'vendor' },
      { header: 'Invoice No.', dataKey: 'invoice' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Amount Paid', dataKey: 'paid', isCurrency: true },
      { header: 'Balance Due', dataKey: 'due', isCurrency: true },
      { header: 'Total Amount', dataKey: 'total', isCurrency: true },
    ];

    let grandTotalPaid = 0;
    let grandTotalDue = 0;
    let grandTotalAmount = 0;

    const rows = filteredPurchases.map(p => {
      const balanceDue = p.purchase_amount - p.paid_amount;
      
      grandTotalPaid += p.paid_amount || 0;
      grandTotalDue += balanceDue || 0;
      grandTotalAmount += p.purchase_amount || 0;

      let dateStr = '-';
      try {
        if (p.purchase_date) {
          dateStr = format(parseISO(p.purchase_date), 'dd MMM yyyy');
        }
      } catch (e) {
        dateStr = 'Invalid Date';
      }

      return {
        date: dateStr,
        vendor: vendorsMap[p.vendor_id] || 'Unknown Vendor',
        invoice: p.invoice_number || '-',
        status: p.payment_type ? p.payment_type.toUpperCase() : '-',
        paid: p.paid_amount || 0,
        due: balanceDue || 0,
        total: p.purchase_amount || 0,
      };
    });

    return {
      title: 'Stock Purchases Report',
      filename: `Stock_Purchases_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        status: 'TOTAL',
        paid: grandTotalPaid,
        due: grandTotalDue,
        total: grandTotalAmount
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Records': filteredPurchases.length.toString(),
      }
    };
  }
};
