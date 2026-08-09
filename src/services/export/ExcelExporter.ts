import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExportData, Exporter, ExportColumn } from './ExportTypes';
import { formatCurrency } from '../../utils/formatters';
import { format, parseISO } from 'date-fns';

export class ExcelExporter implements Exporter {
  async export(data: ExportData): Promise<void> {
    if (!data.rows || data.rows.length === 0) {
      throw new Error('No data available to export');
    }

    try {
      const workbook = XLSX.utils.book_new();
      const exportRows: any[] = [];

      // Add metadata if exists
      if (data.metadata) {
        Object.entries(data.metadata).forEach(([key, value]) => {
          exportRows.push({ [data.columns[0].header]: `${key}: ${value}` });
        });
        exportRows.push({}); // Empty row for spacing
      }

      // Map rows with proper formatting
      data.rows.forEach(row => {
        const formattedRow: any = {};
        data.columns.forEach((col: ExportColumn) => {
          let value = row[col.dataKey];

          if (value == null) {
            formattedRow[col.header] = '';
            return;
          }

          if (col.isCurrency && typeof value === 'number') {
            // Keep as number for Excel, but could format. We will let Excel handle number types or format them as strings
            // Using string formatCurrency for consistent presentation, or keep number if desired
            formattedRow[col.header] = formatCurrency(value);
          } else if (col.isDate && typeof value === 'string') {
            try {
              formattedRow[col.header] = format(parseISO(value), 'dd MMM yyyy');
            } catch (e) {
              formattedRow[col.header] = value;
            }
          } else {
            formattedRow[col.header] = value;
          }
        });
        exportRows.push(formattedRow);
      });

      // Add totals if exist
      if (data.totals) {
        exportRows.push({}); // Empty row
        const totalsRow: any = {};
        let firstCol = true;
        
        data.columns.forEach((col) => {
          if (firstCol) {
            totalsRow[col.header] = 'TOTAL';
            firstCol = false;
          } else if (data.totals![col.dataKey] !== undefined) {
            const val = data.totals![col.dataKey];
            totalsRow[col.header] = col.isCurrency && typeof val === 'number' ? formatCurrency(val) : val;
          } else {
            totalsRow[col.header] = '';
          }
        });
        exportRows.push(totalsRow);
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Simple auto-fit columns
      const colWidths = data.columns.map(col => ({ wch: Math.max(col.header.length, 12) }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, data.title.substring(0, 31)); // Max sheet name 31 chars

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${data.filename}.xlsx`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      throw new Error('Failed to generate Excel file');
    }
  }
}
