import React, { useState, useRef, useEffect } from 'react';
import { FileDown, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { ExportData } from '../../services/export/ExportTypes';
import { exportService } from '../../services/export/ExportService';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';

interface ExportButtonProps {
  data: () => ExportData | Promise<ExportData>;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({ data, disabled = false, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { requirePermission } = usePermissions();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (e: React.MouseEvent, type: 'excel' | 'pdf') => {
    setIsOpen(false);
    
    // If the system treats exports as owner-only, un-comment the next line.
    // Right now, viewers can export as per the audit finding.
    // if (!requirePermission(e as any)) return;

    try {
      setIsExporting(true);
      const exportData = await data();
      
      if (type === 'excel') {
        await exportService.exportExcel(exportData);
      } else {
        await exportService.exportPdf(exportData);
      }
    } catch (error) {
      console.error(`Error exporting to ${type}:`, error);
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={(e) => handleExport(e, 'pdf')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2"
              role="menuitem"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span>Export as PDF</span>
            </button>
            <button
              onClick={(e) => handleExport(e, 'excel')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2"
              role="menuitem"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>Export as Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
