import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportData, Exporter, ExportColumn } from './ExportTypes';
import { formatCurrency } from '../../utils/formatters';
import { format, parseISO } from 'date-fns';

export class PdfExporter implements Exporter {
  async export(data: ExportData): Promise<void> {
    if (!data.rows || data.rows.length === 0) {
      throw new Error('No data available to export');
    }

    try {
      const doc = new jsPDF();
      
      let currentY = 14;
      
      // Add Title
      doc.setFontSize(16);
      doc.text(data.title, 14, currentY);
      currentY += 8;

      // Add Metadata
      if (data.metadata) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        Object.entries(data.metadata).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 14, currentY);
          currentY += 6;
        });
        currentY += 4;
      }

      // Prepare Headers
      const head = [data.columns.map(col => col.header)];

      // Prepare Body
      const body = data.rows.map(row => {
        return data.columns.map((col: ExportColumn) => {
          let value = row[col.dataKey];
          if (value == null) return '';

          if (col.isCurrency && typeof value === 'number') {
            return formatCurrency(value);
          } else if (col.isDate && typeof value === 'string') {
            try {
              return format(parseISO(value), 'dd MMM yyyy');
            } catch (e) {
              return value;
            }
          }
          return String(value);
        });
      });

      // Prepare Footers (Totals)
      let foot: any[][] = [];
      if (data.totals) {
        const totalsRow = data.columns.map((col, index) => {
          if (index === 0) return 'TOTAL';
          if (data.totals![col.dataKey] !== undefined) {
            const val = data.totals![col.dataKey];
            return col.isCurrency && typeof val === 'number' ? formatCurrency(val) : String(val);
          }
          return '';
        });
        foot = [totalsRow];
      }

      // Generate Table
      autoTable(doc, {
        startY: currentY,
        head: head,
        body: body,
        foot: foot.length > 0 ? foot : undefined,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      // Save
      doc.save(`${data.filename}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw new Error('Failed to generate PDF file');
    }
  }
}
