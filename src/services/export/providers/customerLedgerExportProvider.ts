import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { Customer, CustomerTransaction } from '../../customer.service';

export const customerLedgerExportProvider = {
  getExportData: async (customer: Customer, transactions: (CustomerTransaction & { balance_after?: number })[]): Promise<ExportData> => {
    if (!customer) {
      throw new Error('No customer data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Particulars', dataKey: 'particulars' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Credit (+)', dataKey: 'credit', isCurrency: true },
      { header: 'Payment (-)', dataKey: 'payment', isCurrency: true },
      { header: 'Balance', dataKey: 'balance', isCurrency: true },
    ];

    let totalCredit = 0;
    let totalPayment = 0;

    const rows = transactions.map(tx => {
      const isCredit = tx.type === 'credit';
      if (isCredit) totalCredit += tx.amount || 0;
      else totalPayment += tx.amount || 0;

      let dateStr = '-';
      try {
        const dateValue = tx.created_at || tx.business_date || tx.date;
        if (dateValue) {
          dateStr = format(parseISO(dateValue), 'dd MMM yyyy');
        }
      } catch (e) {
        dateStr = 'Invalid Date';
      }

      let particulars = isCredit ? 'Credit Added' : 'Payment Received';
      if (tx.notes) {
        particulars += ` - ${tx.notes}`;
      } else if (tx.payment_method) {
        particulars += ` (${tx.payment_method})`;
      }

      return {
        date: dateStr,
        particulars,
        type: tx.type ? tx.type.toUpperCase() : '-',
        credit: isCredit ? tx.amount : 0,
        payment: !isCredit ? tx.amount : 0,
        balance: tx.balance_after || 0,
      };
    });

    return {
      title: `${customer.name} - Ledger Report`,
      filename: `Customer_Ledger_${customer.name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        type: 'TOTAL',
        credit: totalCredit,
        payment: totalPayment,
        balance: customer.total_credit || 0
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Customer Name': customer.name,
        'Phone': customer.phone || 'N/A',
        'Current Outstanding': customer.total_credit ? `Rs. ${customer.total_credit}` : 'Rs. 0',
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
      }
    };
  }
};
