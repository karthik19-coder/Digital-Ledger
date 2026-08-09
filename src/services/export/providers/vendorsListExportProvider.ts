import { settingsService } from '../../settings.service';
import { ExportData, ExportColumn } from '../ExportTypes';
import { format, parseISO } from 'date-fns';
import { Vendor } from '../../../types/vendor';

interface VendorWithPurchaseStats extends Vendor {
  purchaseCount: number;
  lastPurchaseDate: string | null;
}

export const vendorsListExportProvider = {
  getExportData: async (filteredVendors: VendorWithPurchaseStats[]): Promise<ExportData> => {
    if (!filteredVendors || filteredVendors.length === 0) {
      throw new Error('No data available to export.');
    }

    const settings = await settingsService.getSettings();

    const columns: ExportColumn[] = [
      { header: 'Vendor Name', dataKey: 'name' },
      { header: 'Phone', dataKey: 'phone' },
      { header: 'Address', dataKey: 'address' },
      { header: 'Purchases', dataKey: 'purchases' },
      { header: 'Last Purchase', dataKey: 'last_purchase' },
      { header: 'Outstanding Due', dataKey: 'due', isCurrency: true },
    ];

    let grandTotalDue = 0;
    let grandTotalPurchases = 0;

    const rows = filteredVendors.map(v => {
      grandTotalDue += v.total_due || 0;
      grandTotalPurchases += v.purchaseCount || 0;

      let lastPurchaseStr = '-';
      try {
        if (v.lastPurchaseDate) {
          lastPurchaseStr = format(parseISO(v.lastPurchaseDate), 'dd MMM yyyy');
        }
      } catch (e) {
        lastPurchaseStr = 'Invalid Date';
      }

      return {
        name: v.name || '-',
        phone: v.phone || '-',
        address: v.address || '-',
        purchases: v.purchaseCount || 0,
        last_purchase: lastPurchaseStr,
        due: v.total_due || 0,
      };
    });

    return {
      title: 'Vendor Directory & Dues',
      filename: `Vendors_List_${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      rows,
      totals: {
        last_purchase: 'TOTAL DUE',
        due: grandTotalDue
      },
      metadata: {
        'Store Name': settings.shop_name,
        'Generated On': format(new Date(), 'dd MMM yyyy, hh:mm a'),
        'Total Vendors': filteredVendors.length.toString(),
      }
    };
  }
};
