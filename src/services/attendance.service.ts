import { attendanceRepository } from '../repositories/attendance.repository';

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Leave';

export interface Attendance {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

class AttendanceService {
  private dispatchRefresh() {
    window.dispatchEvent(new Event('app-data-refresh'));
  }

  async getAttendance(date: string): Promise<Attendance[]> {
    const res = await attendanceRepository.getAttendanceByDate(date);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch attendance');
    return res.data || [];
  }

  async getEmployeeAttendance(employeeId: string): Promise<Attendance[]> {
    const res = await attendanceRepository.getAttendanceByEmployee(employeeId);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch employee attendance');
    return res.data || [];
  }

  async getMonthlyAttendance(employeeId: string, monthPrefix: string): Promise<Attendance[]> {
    const res = await attendanceRepository.getAttendanceByEmployee(employeeId);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch monthly attendance');
    
    return (res.data || [])
      .filter(a => a.date.startsWith(monthPrefix))
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  }

  async saveAttendance(employeeId: string, date: string, status: AttendanceStatus): Promise<Attendance> {
    const allForEmployeeRes = await attendanceRepository.getAttendanceByEmployee(employeeId);
    const existing = (allForEmployeeRes.success && allForEmployeeRes.data) 
      ? allForEmployeeRes.data.find(a => a.date === date) 
      : undefined;

    let result;
    if (existing) {
      result = await attendanceRepository.updateAttendance(existing.id, { status });
    } else {
      result = await attendanceRepository.createAttendance({
        employee_id: employeeId,
        date,
        status,
      });
    }

    if (!result.success || !result.data) throw new Error(result.error?.message || 'Failed to save attendance');
    this.dispatchRefresh();
    return result.data;
  }

  async deleteAttendance(id: string): Promise<void> {
    const res = await attendanceRepository.deleteAttendance(id);
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete attendance');
    this.dispatchRefresh();
  }
}

export const attendanceService = new AttendanceService();
