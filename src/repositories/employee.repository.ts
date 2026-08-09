import { supabase } from '../lib/supabase';
import { Employee, EmploymentType, SalaryCycle, EmployeeStatus } from '../services/employee.service';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { validateAmount } from './shared/validators';

export interface DBEmployee {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  daily_wage: number;
  monthly_salary: number;
  salary_type: string;
  phone: string | null;
  join_date: string;
  status: string;
  is_active: boolean;
  employment_type: string;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBEmployee): Employee => ({
  id: dbData.id,
  employee_id: dbData.employee_id || dbData.id,
  name: dbData.name,
  phone: dbData.phone || undefined,
  designation: dbData.role,
  employment_type: (dbData.employment_type as EmploymentType) || 'Full Time',
  monthly_salary: Number(dbData.monthly_salary),
  salary_cycle: (dbData.salary_type as SalaryCycle) || 'Monthly',
  joining_date: dbData.join_date,
  status: (dbData.status as EmployeeStatus) || 'Active',
  notes: dbData.notes || undefined,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
  archived: !dbData.is_active,
});

const mapToDB = (uiData: Partial<Employee>): Partial<DBEmployee> => {
  const dbData: Partial<DBEmployee> = {};
  if (uiData.employee_id !== undefined) dbData.employee_id = uiData.employee_id;
  if (uiData.name !== undefined) dbData.name = uiData.name;
  if (uiData.phone !== undefined) dbData.phone = uiData.phone || null;
  if (uiData.designation !== undefined) dbData.role = uiData.designation;
  if (uiData.employment_type !== undefined) dbData.employment_type = uiData.employment_type;
  if (uiData.monthly_salary !== undefined) {
    dbData.monthly_salary = uiData.monthly_salary;
    // Map daily_wage since UI only provides monthly_salary
    dbData.daily_wage = Number((uiData.monthly_salary / 30).toFixed(2));
  }
  if (uiData.salary_cycle !== undefined) {
    dbData.salary_type = (uiData.salary_cycle === 'Daily' || uiData.salary_cycle === 'Monthly') ? uiData.salary_cycle : 'Monthly';
  }
  if (uiData.joining_date !== undefined) dbData.join_date = uiData.joining_date;
  if (uiData.status !== undefined) dbData.status = uiData.status;
  if (uiData.notes !== undefined) dbData.notes = uiData.notes || null;
  if (uiData.archived !== undefined) dbData.is_active = !uiData.archived;
  return dbData;
};

export const employeeRepository = {
  getEmployees: async (includeArchived = false): Promise<RepoResult<Employee[]>> => {
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
        
      if (!includeArchived) {
        query = query.eq('is_active', true);
      }
        
      const { data, error } = await query;
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBEmployee)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getEmployee: async (id: string): Promise<RepoResult<Employee | null>> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: data ? mapToUI(data as DBEmployee) : null };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createEmployee: async (employeeData: Partial<Employee>): Promise<RepoResult<Employee>> => {
    try {
      if (!employeeData.name) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee name is required' } };
      if (!employeeData.joining_date) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Join date is required' } };
      if (employeeData.monthly_salary !== undefined) validateAmount(employeeData.monthly_salary);

      const dbPayload = mapToDB(employeeData);
      
      const { data, error } = await supabase
        .from('employees')
        .insert(dbPayload)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBEmployee) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateEmployee: async (id: string, updates: Partial<Employee>): Promise<RepoResult<Employee>> => {
    try {
      if (updates.monthly_salary !== undefined) validateAmount(updates.monthly_salary);

      const dbPayload = mapToDB(updates);
      const { data, error } = await supabase
        .from('employees')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBEmployee) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteEmployee: async (id: string): Promise<RepoResult<void>> => {
    try {
      // Soft delete
      const { error } = await supabase
        .from('employees')
        .update({ 
          is_active: false, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
