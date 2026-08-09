export type ExportColumn = {
  header: string;
  dataKey: string;
  isCurrency?: boolean;
  isDate?: boolean;
};

export type ExportData = {
  title: string;
  filename: string;
  columns: ExportColumn[];
  rows: any[];
  totals?: Record<string, any>;
  metadata?: Record<string, any>;
};

export interface Exporter {
  export(data: ExportData): Promise<void>;
}
