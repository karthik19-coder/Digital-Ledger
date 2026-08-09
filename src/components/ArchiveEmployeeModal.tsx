import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { employeeService, Employee } from '../services/employee.service';
import { Button } from '@/components/ui/button';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface ArchiveEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee | null;
}

export function ArchiveEmployeeModal({ isOpen, onClose, onSuccess, employee }: ArchiveEmployeeModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !employee) return null;

  const handleArchive = async () => {
    setError(null);
    setIsArchiving(true);
    
    try {
      await employeeService.archiveEmployee(employee.id);
      onSuccess();
    } catch (err: unknown) {
      console.error('Error archiving employee:', err);
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to archive employee');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Archive Employee?</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {error && (
            <div className={`mb-4 p-3 ${moduleTheme.salary.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          
          <p className={`${colors.neutral.text}`}>
            Are you sure you want to archive <strong>{employee.name}</strong>?
          </p>
          <div className="mt-4 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
            <p className="text-sm text-orange-800 font-medium">
              Attendance, Salary, and Payroll History will be preserved.
            </p>
            <p className="text-xs text-orange-600 mt-1">
              You can restore archived employees at any time.
            </p>
          </div>
        </div>

        <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col md:flex-row gap-3 shrink-0`}>
          <Button 
            type="button" 
            variant="outline" 
            className={`w-full md:flex-1 bg-white hover:${colors.neutral.bg}`}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleArchive} 
            className="w-full md:flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm"
            disabled={isArchiving}
          >
            {isArchiving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Archiving...</>
            ) : (
              'Archive'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
