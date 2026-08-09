import { employeeRepository } from '../repositories/employee.repository';

export type EmploymentType = 'Full Time' | 'Part Time' | 'Temporary';
export type SalaryCycle = 'Monthly' | 'Weekly' | 'Daily';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  phone?: string;
  designation: string;
  employment_type: EmploymentType;
  monthly_salary: number;
  salary_cycle: SalaryCycle;
  joining_date: string;
  status: EmployeeStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

class EmployeeService {
  private dispatchRefresh() {
    window.dispatchEvent(new Event('app-data-refresh'));
  }

  async generateEmployeeId(): Promise<string> {
    const res = await employeeRepository.getEmployees(true);
    const employees = res.success && res.data ? res.data : [];
    if (employees.length === 0) return 'EMP-0001';
    
    // Find the highest ID
    let maxId = 0;
    employees.forEach(emp => {
      if (emp.employee_id && emp.employee_id.startsWith('EMP-')) {
        const numPart = parseInt(emp.employee_id.substring(4), 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    });
    
    const nextId = maxId + 1;
    return `EMP-${nextId.toString().padStart(4, '0')}`;
  }

  async getEmployees(includeArchived = false): Promise<Employee[]> {
    const res = await employeeRepository.getEmployees(includeArchived);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch employees');
    return res.data || [];
  }

  async getEmployee(id: string): Promise<Employee | null> {
    const res = await employeeRepository.getEmployee(id);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch employee');
    return res.data;
  }

  async addEmployee(data: Omit<Employee, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'archived'>): Promise<Employee> {
    const employee_id = await this.generateEmployeeId();
    
    const res = await employeeRepository.createEmployee({
      ...data,
      employee_id,
      archived: false,
    });
    
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to add employee');
    this.dispatchRefresh();
    return res.data;
  }

  async updateEmployee(id: string, data: Partial<Omit<Employee, 'id' | 'employee_id' | 'created_at' | 'archived'>>): Promise<Employee> {
    const res = await employeeRepository.updateEmployee(id, data);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update employee');
    this.dispatchRefresh();
    return res.data;
  }

  async archiveEmployee(id: string): Promise<void> {
    const res = await employeeRepository.updateEmployee(id, { archived: true });
    if (!res.success) throw new Error(res.error?.message || 'Failed to archive employee');
    this.dispatchRefresh();
  }

  async restoreEmployee(id: string): Promise<void> {
    const res = await employeeRepository.updateEmployee(id, { archived: false });
    if (!res.success) throw new Error(res.error?.message || 'Failed to restore employee');
    this.dispatchRefresh();
  }

  async searchEmployees(query: string, includeArchived = false): Promise<Employee[]> {
    const employees = await this.getEmployees(includeArchived);
    if (!query.trim()) return employees;
    
    const lowerQuery = query.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(lowerQuery) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(lowerQuery)) ||
      (e.phone && e.phone.includes(lowerQuery)) ||
      e.designation.toLowerCase().includes(lowerQuery)
    );
  }
}

export const employeeService = new EmployeeService();
