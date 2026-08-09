import { getDaysInMonth, parseISO, format, differenceInMonths, startOfMonth } from 'date-fns';
import { employeeService, Employee } from './employee.service';
import { attendanceService } from './attendance.service';

export type SalaryStatus = 'Paid' | 'Partially Paid' | 'Pending';

export interface SalaryCalculation {
  employee_id: string;
  month: string; // MM
  year: string; // YYYY
  monthly_salary: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  calculated_salary: number;
  paid_amount: number;
  pending_amount: number;
  status: SalaryStatus;
  created_at: string;
  updated_at: string;
}

class SalaryService {
  /**
   * Dispatches a refresh event for salary UI
   */
  public dispatchRefresh() {
    window.dispatchEvent(new Event('app-data-refresh'));
  }

  /**
   * Calculates the salary for a single employee for a given month
   * @param employeeId Employee ID
   * @param monthPrefix format: 'YYYY-MM'
   * @param paidAmount Amount paid in this month (provided by payroll service)
   */
  async calculateSalary(employeeId: string, monthPrefix: string, paidAmount: number = 0, referenceDate?: string): Promise<SalaryCalculation | null> {
    const employee = await employeeService.getEmployee(employeeId);
    if (!employee) return null;

    return this.calculateEmployeeSalary(employee, monthPrefix, paidAmount, referenceDate);
  }

  /**
   * Calculates the salary for all active employees for a given month
   * @param monthPrefix format: 'YYYY-MM'
   * @param getPaidAmountCallback Callback to get paid amount per employee
   */
  async calculateAllEmployees(monthPrefix: string, getPaidAmountCallback: (empId: string) => number | Promise<number>, referenceDate?: string): Promise<SalaryCalculation[]> {
    const activeEmployees = await employeeService.getEmployees(false);
    const calculations = await Promise.all(
      activeEmployees.map(async emp => this.calculateEmployeeSalary(emp, monthPrefix, await getPaidAmountCallback(emp.id), referenceDate))
    );
    return calculations;
  }

  /**
   * Calculates the lifetime earned salary for an employee from their joining date
   */
  async calculateLifetimeEarnedSalary(employee: Employee, referenceDate?: string): Promise<number> {
    const joiningDate = employee.joining_date ? parseISO(employee.joining_date) : new Date();
    const startM = startOfMonth(joiningDate);
    const refDate = referenceDate ? parseISO(referenceDate) : new Date();
    const monthsDiff = Math.max(0, differenceInMonths(refDate, startM)) + 1; // including current month
    
    let total_calculated = 0;
    
    for (let i = 0; i < monthsDiff; i++) {
      const d = new Date(startM);
      d.setMonth(d.getMonth() + i);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const calc = await this.calculateEmployeeSalary(employee, prefix, 0, referenceDate); 
      total_calculated += calc.calculated_salary;
    }

    return total_calculated;
  }

  /**
   * Core logic to compute an employee's salary purely from attendance records
   */
  async calculateEmployeeSalary(employee: Employee, monthPrefix: string, paidAmount: number = 0, referenceDate?: string): Promise<SalaryCalculation> {
    const [year, month] = monthPrefix.split('-');
    
    // Parse total days in the given month
    const totalDays = getDaysInMonth(parseISO(`${monthPrefix}-01`));
    
    // Use provided reference date or fall back to today
    const cutoffStr = referenceDate || format(new Date(), 'yyyy-MM-dd');
    
    // Get attendance records for this month
    const records = await attendanceService.getMonthlyAttendance(employee.id, monthPrefix);

    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let present = 0;

    // Only count records that are on or after joining_date AND not in future
    records.forEach(r => {
      if (r.date >= employee.joining_date && r.date <= cutoffStr) {
        if (r.status === 'Absent') absent++;
        if (r.status === 'Half Day') halfDay++;
        if (r.status === 'Leave') leave++;
        if (r.status === 'Present') present++;
      }
    });

    // DO NOT USE PLACEHOLDER VALUES
    // Worked Days = Present + Leave + (Half Day * 0.5)
    const payableDays = present + leave + (halfDay * 0.5);

    // Calculate total salary based on monthly salary rate and valid days
    const dailyRate = employee.monthly_salary / totalDays;
    const calculatedSalary = Math.round(payableDays * dailyRate);

    const now = new Date().toISOString();
    const pendingAmount = Math.max(0, calculatedSalary - paidAmount);
    
    let status: SalaryStatus = 'Pending';
    if (calculatedSalary > 0) {
      if (paidAmount >= calculatedSalary) status = 'Paid';
      else if (paidAmount > 0) status = 'Partially Paid';
    } else if (paidAmount > 0) {
       status = 'Paid'; // Overpaid or paid for 0 days
    }

    return {
      employee_id: employee.id,
      month,
      year,
      monthly_salary: employee.monthly_salary,
      present_days: present,
      half_days: halfDay,
      absent_days: absent,
      leave_days: leave,
      calculated_salary: calculatedSalary,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      status: status,
      created_at: now,
      updated_at: now
    };
  }
}

export const salaryService = new SalaryService();
