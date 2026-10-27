import { useState, useEffect, useMemo, useCallback } from 'react';

import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader2, User, Banknote, BadgeIndianRupee
} from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { employeeService, Employee } from '../services/employee.service';
import { payrollService } from '../services/payroll.service';
import { salaryService, SalaryCalculation } from '../services/salary.service';
import { PaySalaryModal } from '../components/PaySalaryModal';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  EmptyState,
  FinancialCard,
  SectionHeader,
  PrimaryActionButton,
  HistoryCard
} from '../components/shared';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


import { useQueryCache } from '../hooks/useQueryCache';
import { useCachedState } from '../hooks/useCachedState';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

interface EmployeeSalaryRow extends Employee {
  calculation: SalaryCalculation;
  recentPayments: any[];
}

export default function Salary() {
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  const { selectedDate, setSelectedDate } = useBusinessDate();
  const monthStr = format(selectedDate, 'yyyy-MM');
  const cacheKey = `salary-${monthStr}`;

  const fetchData = async () => {
    // Load active employees only (and joined on or before selected month)
    const allEmps = await employeeService.getEmployees(false);
    const activeEmps = allEmps.filter(e => e.status === 'Active' && !e.archived && e.joining_date.slice(0, 7) <= monthStr);

    // Calculate for all — use selectedDate as the attendance cutoff
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const calcs = await salaryService.calculateAllEmployees(monthStr, (empId) => payrollService.getPaidAmountForMonth(empId, monthStr), dateStr);
    
    // Load payments
    const payments = await payrollService.getPayments();
    
    return { employees: activeEmps, calculations: calcs, allPayments: payments };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadData } = useQueryCache(
    cacheKey,
    fetchData,
    [selectedDate]
  );

  const employees = cachedRes?.employees || [];
  const calculations = cachedRes?.calculations || [];
  const allPayments = cachedRes?.allPayments || [];

  // Modal State
  const { isOpen: isModalOpen, openModal, closeModal } = useModalNavigation('salary-payment');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPendingSalary, setSelectedPendingSalary] = useState(0);

  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('business-date-changed', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('business-date-changed', handleRefresh);
    };
  }, [loadData]);


  // Build the combined list
  const salaryRows: EmployeeSalaryRow[] = useMemo(() => {
    return employees.map(emp => {
      const calc = calculations.find(c => c.employee_id === emp.id);
      const recentPayments = allPayments
        .filter(p => p.employee_id === emp.id && (p.payment_type === 'Salary Advance' || p.payment_type === 'Salary Settlement'))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 3);
        
      return {
        ...emp,
        calculation: calc!,
        recentPayments
      };
    }).filter(row => row.calculation !== undefined);
  }, [employees, calculations, allPayments]);

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Calculating salaries...</p>
      </div>
    );
  }

  return (
    <div className={`${colors.neutral.bg} min-h-screen pb-24 safe-page-pb`}>
      {/* Header Banner */}
      <AppHeaderBanner
        theme="salary"
        title="Salary"
        subtitle="Manage employee salary payments"
        icon={BadgeIndianRupee}
        onBack={() => smartBack('/expenses/employees')}
        rightAction={
          <div className="flex items-center bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm p-1 shadow-sm shrink-0">
            <button 
              onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
              className="p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative flex items-center px-2 border-x border-white/20 mx-1">
              <CalendarIcon className="w-4 h-4 text-white mr-1.5" />
              <input 
                type="month" 
                value={monthStr}
                max={format(new Date(), 'yyyy-MM')}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(parseISO(`${e.target.value}-01`));
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className="font-bold text-white text-sm whitespace-nowrap pointer-events-none select-none">
                {format(selectedDate, 'MMM yyyy')}
              </span>
            </div>
            <button 
              onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              disabled={monthStr >= format(new Date(), 'yyyy-MM')}
              className={`p-1.5 rounded-md transition-colors ${
                monthStr >= format(new Date(), 'yyyy-MM')
                  ? 'text-white/30 cursor-not-allowed'
                  : 'hover:bg-white/20 text-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-6 max-w-md lg:max-w-5xl mx-auto w-full">
        {/* Employee List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salaryRows.length === 0 ? (
            <EmptyState 
              icon={User}
              title="No Employees Available"
              subtitle="Please add an employee first."
            />
          ) : (
            salaryRows.map((row) => (
              <FinancialCard
                key={row.id}
                title={row.name}
                subtitle={row.designation}
                amount={row.calculation.pending_amount}
                amountColor="text-red-700"
                icon={User}
                theme="salary"
                className="flex flex-col border border-slate-200"
              >
                <div className="grid grid-cols-2 gap-2 px-5 pb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-bold block mb-1">Monthly Salary</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(row.monthly_salary)}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                    <span className="text-[10px] sm:text-xs text-blue-600 font-bold block mb-1">Earned Till Date</span>
                    <span className="text-sm font-black text-blue-700">{formatCurrency(row.calculation.calculated_salary)}</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100">
                    <span className="text-[10px] sm:text-xs text-green-600 font-bold block mb-1">Already Paid</span>
                    <span className="text-sm font-black text-green-700">{formatCurrency(row.calculation.paid_amount)}</span>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center border border-red-100">
                    <span className="text-[10px] sm:text-xs text-red-600 font-bold block mb-1">Pending Salary</span>
                    <span className="text-sm font-black text-red-700">{formatCurrency(row.calculation.pending_amount)}</span>
                  </div>
                </div>

                <div className={`p-4 border-t border-slate-100 bg-slate-50 rounded-b-[20px] flex-1 flex flex-col`}>
                  {row.recentPayments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Latest Payments</h4>
                      <div className="space-y-2">
                        {row.recentPayments.map((payment, idx) => (
                          <div key={idx}>
                            <HistoryCard
                              title={format(parseISO(payment.payment_date), 'dd MMM')}
                              subtitle={`Paid via ${payment.payment_method}`}
                              amount={payment.amount}
                              type="neutral"
                              icon={BadgeIndianRupee}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    <PrimaryActionButton
                      theme="salary"
                      onClick={(e) => {
                        if (!requirePermission(e)) return;
                        setSelectedEmployee(row);
                        setSelectedPendingSalary(row.calculation.pending_amount);
                        openModal();
                      }}
                      className={cn("w-full h-11 shadow-sm", !isOwner() && "opacity-50 cursor-not-allowed")}
                      icon={BadgeIndianRupee}
                    >
                      Pay Salary
                    </PrimaryActionButton>
                  </div>
                </div>
              </FinancialCard>
            ))
          )}
        </div>
      </div>

      <PaySalaryModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={() => {
          closeModal();
          loadData();
        }}
        employee={selectedEmployee}
        pendingSalary={selectedPendingSalary}
      />
    </div>
  );
}
