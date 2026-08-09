import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format } from 'date-fns';
import { Customer } from '../../customer.service';

export const customersListExportProvider = {
  getExportData: async (filteredCustomers: Customer[]): Promise<ExportData> => {
    if (!filteredCustomers || filteredCustomers.length === 0) {
      throw new Error('No data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Customer Name', dataKey: 'name' },
      { header: 'Phone', dataKey: 'phone' },
      { header: 'Address', dataKey: 'address' },
      { header: 'Outstanding Balance', dataKey: 'balance', isCurrency: true },
    ];

    let grandTotal = 0;

    const rows = filteredCustomers.map(c => {
      grandTotal += c.total_credit || 0;

      return {
        name: c.name || '-',
        phone: c.phone || '-',
        address: c.address || '-',
        balance: c.total_credit || 0,
      };
    });

    return {
      title: 'Customer Directory & Balances',
      filename: `Customers_List_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        address: 'TOTAL OUTSTANDING',
        balance: grandTotal
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Customers': filteredCustomers.length.toString(),
      }
    };
  }
};
