import { ExcelExporter } from './ExcelExporter';
import { PdfExporter } from './PdfExporter';
import { ExportData, Exporter } from './ExportTypes';

class ExportService {
  private excelExporter: Exporter;
  private pdfExporter: Exporter;

  constructor() {
    this.excelExporter = new ExcelExporter();
    this.pdfExporter = new PdfExporter();
  }

  async exportExcel(data: ExportData): Promise<void> {
    await this.excelExporter.export(data);
  }

  async exportPdf(data: ExportData): Promise<void> {
    await this.pdfExporter.export(data);
  }
}

export const exportService = new ExportService();
