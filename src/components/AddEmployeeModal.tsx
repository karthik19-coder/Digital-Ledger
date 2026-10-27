import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, User, Phone, IndianRupee, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { employeeService, EmployeeStatus } from '../services/employee.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DESIGNATIONS = [
  'Cashier',
  'Helper',
  'Manager',
  'Packing',
  'Delivery',
  'Cleaner',
  'Other'
];

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [customDesignation, setCustomDesignation] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<EmployeeStatus | ''>('Active');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setDesignation('');
    setCustomDesignation('');
    setShowCustom(false);
    setShowCustom(false);
    setMonthlySalary('');
    setPhone('');
    setJoiningDate(format(new Date(), 'yyyy-MM-dd'));
    setStatus('Active');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalDesignation = showCustom ? customDesignation.trim() : designation;

    if (!name.trim()) {
      setError('Employee Name is required');
      return;
    }
    if (!finalDesignation) {
      setError('Designation is required');
      return;
    }
    if (!monthlySalary || isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0) {
      setError('Please enter a valid monthly salary');
      return;
    }
    if (!joiningDate) {
      setError('Joining Date is required');
      return;
    }
    if (!status) {
      setError('Status is required');
      return;
    }

    setIsSaving(true);
    try {
      await employeeService.addEmployee({
        name: name.trim(),
        designation: finalDesignation,
        employment_type: 'Full Time',
        monthly_salary: Number(monthlySalary),
        salary_cycle: 'Monthly',
        phone: phone.trim(),
        joining_date: joiningDate,
        status: status as EmployeeStatus,
        notes: notes.trim(),
      });
      onSuccess();
    } catch (err: unknown) {
      console.error('Error adding employee:', err);
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to add employee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] sm:pb-4 animate-in fade-in">
      <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[min(88vh,640px)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add Employee</h2>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col overflow-hidden min-h-0">
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className={`p-3 ${moduleTheme.salary.bgLight} text-red-700 text-sm rounded-lg flex items-start border border-red-100`}>
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="empName" className="text-sm font-medium text-slate-700">
                Employee Name <span className={`${moduleTheme.salary.textLight}`}>*</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="empName"
                  autoFocus
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Designation <span className={`${moduleTheme.salary.textLight}`}>*</span>
              </Label>
              <select
                value={showCustom ? 'Other' : designation}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setShowCustom(true);
                    setDesignation('');
                  } else {
                    setShowCustom(false);
                    setDesignation(val);
                  }
                }}
                className={`w-full h-11 text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950`}
              >
                <option value="">Select Designation</option>
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            
            {showCustom && (
              <div className="space-y-2">
                <Input
                  placeholder="Enter custom designation"
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {/* Monthly Salary */}
            <div className="space-y-2">
              <Label htmlFor="empSalary" className="text-sm font-medium text-slate-700">
                Monthly Salary <span className={`${moduleTheme.salary.textLight}`}>*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg pointer-events-none">
                    ₹
                  </span>
                  <Input
                  id="empSalary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full pl-12 pr-4 h-11"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="empPhone" className="text-sm font-medium text-slate-700">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="empPhone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Joining Date */}
            <div className="space-y-2">
              <Label htmlFor="empJoined" className="text-sm font-medium text-slate-700">
                Joining Date <span className={`${moduleTheme.salary.textLight}`}>*</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="empJoined"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="pl-10 h-11 w-full"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Status <span className={`${moduleTheme.salary.textLight}`}>*</span>
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                className={`w-full h-11 text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950`}
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="empNotes" className="text-sm font-medium text-slate-700">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <textarea
                  id="empNotes"
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full min-h-[80px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 resize-none`}
                />
              </div>
            </div>
          </div>

          <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col md:flex-row gap-3 shrink-0`}>
            <Button 
              type="button" 
              variant="outline" 
              className={`w-full md:flex-1 bg-white hover:${colors.neutral.bg}`}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                'Save Employee'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
