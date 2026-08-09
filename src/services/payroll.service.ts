import { getDaysInMonth, parseISO, startOfMonth, differenceInMonths, format } from 'date-fns';
import { employeeService } from './employee.service';
import { expenseService } from './expense.service';
import { salaryService, SalaryCalculation, SalaryStatus } from './salary.service';

import { salaryRepository } from '../repositories/salary.repository';

export type PaymentType = 'Salary Advance' | 'Salary Settlement' | 'Bonus' | 'Reimbursement';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank';

export interface PayrollPayment {
  id: string;
  employee_id: string;
  payment_type: PaymentType;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  payment_date: string;
  expense_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollPaymentWithEmployee extends PayrollPayment {
  // Using `any` for employee object avoids circular dependencies with complex employee entity typing
  employee: any;
}

export interface PaymentSummary {
  total_payments: number;
  salary_paid: number;
  bonuses: number;
  reimbursements: number;
}

export interface EmployeeLedger {
  // Using `any` for employee object avoids circular dependencies with complex employee entity typing
  employee: any;
  total_calculated_salary: number;
  total_paid: number;
  pending_salary: number;
  history: PayrollPayment[];
}

class PayrollService {
  /**
   * Dispatches a refresh event for salary UI
   */
  public dispatchRefresh() {
    window.dispatchEvent(new Event('payroll-refresh'));
    window.dispatchEvent(new CustomEvent('transaction-mutated', { detail: { date: null } }));
  }

  /**
   * Helper to get total amount of advance/settlement paid to an employee in a given month
   */
  public async getPaidAmountForMonth(employeeId: string, monthPrefix: string): Promise<number> {
    const res = await salaryRepository.getSalaryPaymentsByEmployee(employeeId);
    if (!res.success) return 0;
    
    return (res.data || [])
      .filter(p => p.payment_date.startsWith(monthPrefix) && (p.payment_type === 'Salary Advance' || p.payment_type === 'Salary Settlement'))
      .reduce((sum, p) => sum + p.amount, 0);
  }

  // --- Payments ---

  async getSalaryHistory(): Promise<PayrollPaymentWithEmployee[]> {
    const res = await salaryRepository.getSalaryPayments();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch salary history');
    
    const allPayments = res.data || [];
    const allEmployees = await employeeService.getEmployees(); // includes inactive
    
    return allPayments.map(p => ({
      ...p,
      employee: allEmployees.find(e => e.id === p.employee_id) || { name: 'Unknown', employee_id: '---' }
    }));
  }

  async getPaymentSummary(monthPrefix: string): Promise<PaymentSummary> {
    const res = await salaryRepository.getSalaryPayments();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch payment summary');
    
    const allPayments = res.data || [];
    const monthPayments = allPayments.filter(p => p.payment_date.startsWith(monthPrefix));
    
    let salary_paid = 0;
    let bonuses = 0;
    let reimbursements = 0;

    monthPayments.forEach(p => {
      if (p.payment_type === 'Salary Advance' || p.payment_type === 'Salary Settlement') {
        salary_paid += p.amount;
      } else if (p.payment_type === 'Bonus') {
        bonuses += p.amount;
      } else if (p.payment_type === 'Reimbursement') {
        reimbursements += p.amount;
      }
    });

    return {
      total_payments: monthPayments.length,
      salary_paid,
      bonuses,
      reimbursements
    };
  }

  async getPayments(employeeId?: string): Promise<PayrollPayment[]> {
    if (employeeId) {
      const res = await salaryRepository.getSalaryPaymentsByEmployee(employeeId);
      if (!res.success) throw new Error(res.error?.message || 'Failed to fetch payments for employee');
      return res.data || [];
    }
    
    const res = await salaryRepository.getSalaryPayments();
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch all payments');
    return res.data || [];
  }

  async payEmployee(data: Omit<PayrollPayment, 'id' | 'created_at' | 'updated_at' | 'expense_id'>): Promise<PayrollPayment> {
    const employee = await employeeService.getEmployee(data.employee_id);
    if (!employee) throw new Error('Employee not found');

    const now = new Date().toISOString();
    
    // Create expense
    const expense = await expenseService.addExpense({
      category: 'Salary', // Must match the fixed category in expenseService
      expense_type: 'business',
      amount: data.amount,
      payment_method: data.payment_method,
      expense_date: data.payment_date || now.split('T')[0],
      reference_number: data.reference_number,
      notes: `${data.payment_type} for ${employee.name}${data.notes ? ' - ' + data.notes : ''}`
    });

    const res = await salaryRepository.createSalaryPayment(data);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to create salary payment');
    
    const payment = res.data;
    // We can't attach expense_id directly to salary_payments in DB schema, but we fulfill the contract
    
    this.dispatchRefresh();
    return payment;
  }

  async editPayment(id: string, updates: Partial<PayrollPayment>): Promise<PayrollPayment> {
    const res = await salaryRepository.getSalaryPayment(id);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Payment not found');

    const payment = res.data;
    
    // Update expense if amount or method changed
    // NOTE: expense_id mapping might be lost since DB does not store expense_id for salary_payments.
    // If expense_id exists on the object (it won't coming from DB, but keeping logic just in case)
    if (payment.expense_id && (updates.amount !== undefined || updates.payment_method !== undefined || updates.payment_date !== undefined)) {
      try {
        const expense = await expenseService.getAllExpenses().then(exps => exps.find(e => e.id === payment.expense_id));
        if (expense) {
          await expenseService.updateExpense(payment.expense_id, {
            category: expense.category,
            expense_type: expense.expense_type,
            amount: updates.amount !== undefined ? updates.amount : expense.amount,
            payment_method: updates.payment_method !== undefined ? updates.payment_method : expense.payment_method,
            expense_date: updates.payment_date !== undefined ? updates.payment_date : expense.expense_date,
            notes: expense.notes,
            reference_number: expense.reference_number
          });
        }
      } catch (err) {
        console.error('Failed to update linked expense for payroll payment:', err);
      }
    }

    const updateRes = await salaryRepository.updateSalaryPayment(id, updates);
    if (!updateRes.success || !updateRes.data) throw new Error(updateRes.error?.message || 'Failed to update payment');

    this.dispatchRefresh();
    return updateRes.data;
  }

  async deletePayment(id: string): Promise<void> {
    const res = await salaryRepository.getSalaryPayment(id);
    if (!res.success || !res.data) return; // Silent return if not found, as per original logic

    const payment = res.data;

    // Delete associated expense
    if (payment.expense_id) {
      await expenseService.deleteExpense(payment.expense_id);
    }

    const delRes = await salaryRepository.deleteSalaryPayment(id);
    if (!delRes.success) throw new Error(delRes.error?.message || 'Failed to delete payment');
    
    this.dispatchRefresh();
  }

  async getEmployeeLedger(employeeId: string): Promise<EmployeeLedger | null> {
    const employee = await employeeService.getEmployee(employeeId);
    if (!employee) return null;

    const history = await this.getPayments(employeeId);
    
    // Calculate total paid (only Advance and Settlement reduce pending)
    const total_paid = history
      .filter(p => p.payment_type === 'Salary Advance' || p.payment_type === 'Salary Settlement')
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate total salary ever
    const total_calculated = await salaryService.calculateLifetimeEarnedSalary(employee);

    const pending_salary = total_calculated - total_paid;

    return {
      employee,
      total_calculated_salary: total_calculated,
      total_paid,
      pending_salary,
      history
    };
  }

}

export const payrollService = new PayrollService();
