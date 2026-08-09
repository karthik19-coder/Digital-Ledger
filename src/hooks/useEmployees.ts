import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { employeeService, Employee } from '../services/employee.service';
import { attendanceService } from '../services/attendance.service';
import { payrollService } from '../services/payroll.service';

export function useEmployees() {
  const fetchEmployees = useCallback(async () => {
    return employeeService.getEmployees();
  }, []);

  const { data: employees, loading, error, mutate: refresh } = useQueryCache(
    'employees-list',
    fetchEmployees
  );

  const getEmployee = async (id: string) => {
    return employeeService.getEmployee(id);
  };

  const addEmployee = async (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    const res = await employeeService.addEmployee(data);
    await refresh();
    return res;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const res = await employeeService.updateEmployee(id, updates);
    await refresh();
    return res;
  };

  const deleteEmployee = async (id: string) => {
    await employeeService.archiveEmployee(id);
    await refresh();
  };

  const markAttendance = async (employeeId: string, status: string, date: string, notes?: string) => {
    const res = await attendanceService.saveAttendance(employeeId, date, status as any);
    await refresh();
    return res;
  };

  const recordPayment = async (data: any) => {
    const res = await payrollService.payEmployee(data);
    await refresh();
    return res;
  };

  return {
    employees: employees || [],
    loading,
    error,
    refresh,
    getEmployee,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    markAttendance,
    recordPayment
  };
}
