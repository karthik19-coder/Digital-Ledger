import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { Vendor, VendorTransaction } from '../../../types/vendor';

export const vendorLedgerExportProvider = {
  getExportData: async (vendor: Vendor, transactions: (VendorTransaction & { runningBalance?: number })[], purchasesMap: Record<string, string>): Promise<ExportData> => {
    if (!vendor) {
      throw new Error('No vendor data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Particulars', dataKey: 'particulars' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Purchase (+)', dataKey: 'purchase', isCurrency: true },
      { header: 'Payment (-)', dataKey: 'payment', isCurrency: true },
      { header: 'Balance', dataKey: 'balance', isCurrency: true },
    ];

    let totalPurchase = 0;
    let totalPayment = 0;

    const rows = transactions.map(tx => {
      const isPurchase = tx.type === 'purchase';
      if (isPurchase) totalPurchase += tx.amount || 0;
      else totalPayment += tx.amount || 0;

      let dateStr = '-';
      try {
        if (tx.date) {
          dateStr = format(parseISO(tx.date), 'dd MMM yyyy');
        }
      } catch (e) {
        dateStr = 'Invalid Date';
      }

      let particulars = isPurchase ? 'Stock Purchase' : 'Payment Made';
      
      if (tx.id && purchasesMap[tx.id]) {
        particulars += ` (Inv: ${purchasesMap[tx.id]})`;
      } else if (tx.notes) {
        particulars += ` - ${tx.notes}`;
      } else if (tx.payment_method) {
        particulars += ` (${tx.payment_method})`;
      }

      return {
        date: dateStr,
        particulars,
        type: tx.type ? tx.type.toUpperCase() : '-',
        purchase: isPurchase ? tx.amount : 0,
        payment: !isPurchase ? tx.amount : 0,
        balance: tx.runningBalance || 0,
      };
    });

    return {
      title: `${vendor.name} - Ledger Report`,
      filename: `Vendor_Ledger_${vendor.name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        type: 'TOTAL',
        purchase: totalPurchase,
        payment: totalPayment,
        balance: vendor.total_due || 0
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Vendor Name': vendor.name,
        'Phone': vendor.phone || 'N/A',
        'Current Due': vendor.total_due ? `Rs. ${vendor.total_due}` : 'Rs. 0',
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
      }
    };
  }
};
