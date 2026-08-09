import { supabase } from '../lib/supabase';
import { Attendance, AttendanceStatus } from '../services/attendance.service';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';

export interface DBAttendance {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapToUI = (dbData: DBAttendance): Attendance => ({
  id: dbData.id,
  employee_id: dbData.employee_id,
  date: dbData.date,
  status: dbData.status as AttendanceStatus,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at,
});

const mapToDB = (uiData: Partial<Attendance>): Partial<DBAttendance> => {
  const dbData: Partial<DBAttendance> = {};
  if (uiData.employee_id !== undefined) dbData.employee_id = uiData.employee_id;
  if (uiData.date !== undefined) dbData.date = uiData.date;
  if (uiData.status !== undefined) dbData.status = uiData.status;
  // Notes are intentionally ignored per requirements
  return dbData;
};

export const attendanceRepository = {
  getAttendance: async (): Promise<RepoResult<Attendance[]>> => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBAttendance)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getAttendanceByEmployee: async (employeeId: string): Promise<RepoResult<Attendance[]>> => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBAttendance)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getAttendanceByDate: async (date: string): Promise<RepoResult<Attendance[]>> => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
        
      if (error) return handleDbError(error);
      return { success: true, data: (data || []).map(row => mapToUI(row as DBAttendance)) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  createAttendance: async (attendanceData: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>): Promise<RepoResult<Attendance>> => {
    try {
      if (!attendanceData.employee_id) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID is required' } };
      if (!attendanceData.date) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Date is required' } };
      if (!attendanceData.status) return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Status is required' } };

      const dbPayload = mapToDB(attendanceData);
      
      const { data, error } = await supabase
        .from('attendance')
        .insert(dbPayload)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBAttendance) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateAttendance: async (id: string, updates: Partial<Attendance>): Promise<RepoResult<Attendance>> => {
    try {
      const dbPayload = mapToDB(updates);
      const { data, error } = await supabase
        .from('attendance')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) return handleDbError(error);
      return { success: true, data: mapToUI(data as DBAttendance) };
    } catch (e) {
      return handleDbError(e);
    }
  },

  deleteAttendance: async (id: string): Promise<RepoResult<void>> => {
    try {
      // Hard delete as per requirements (table lacks soft delete columns)
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);
        
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
