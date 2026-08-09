import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar as CalendarIcon, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { employeeService, Employee } from '../services/employee.service';
import { attendanceService, Attendance } from '../services/attendance.service';
import { useSmartBack } from '../hooks/useSmartBack';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


export default function EmployeeAttendanceHistory() {
  const { id } = useParams();
  const { smartBack } = useSmartBack();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Format: YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const emp = await employeeService.getEmployee(id);
      setEmployee(emp);
      
      const records = await attendanceService.getMonthlyAttendance(id, selectedMonth);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedMonth]);

  useEffect(() => {
    setIsLoading(true);
    loadData();

    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      };
  }, [loadData]);

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM (EEE)');
    } catch {
      return dateStr;
    }
  };

  const stats = useMemo(() => {
    let present = 0, absent = 0, halfDay = 0, leave = 0;
    attendanceRecords.forEach(r => {
      if (r.status === 'Present') present++;
      if (r.status === 'Absent') absent++;
      if (r.status === 'Half Day') halfDay++;
      if (r.status === 'Leave') leave++;
    });
    return { present, absent, halfDay, leave };
  }, [attendanceRecords]);

  if (isLoading && !employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading history...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Employee Not Found</h2>
        <button onClick={() => smartBack('/expenses/employees')} className={`px-4 py-2 ${moduleTheme.attendance.bg} text-white rounded-lg`}>
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className={`${colors.neutral.bg} min-h-screen pb-24 safe-page-pb`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${colors.neutral.bg} pt-4 px-4 sm:px-6 pb-4 border-b ${colors.neutral.border}`}>
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => smartBack(`/expenses/employees/${id}`)}
            className={`w-10 h-10 flex items-center justify-center rounded-full bg-white border ${colors.neutral.border} ${colors.neutral.text} hover:${colors.neutral.bg} shadow-sm shrink-0`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Attendance History</h1>
            <p className="text-sm text-slate-500 mt-0.5">Monthly records and summary</p>
          </div>
        </div>

        {/* Profile Summary */}
        <div className={`flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border ${colors.neutral.border} mb-4`}>
          <div className={`w-12 h-12 rounded-full bg-slate-100 ${colors.neutral.text} font-bold flex items-center justify-center shrink-0 border ${colors.neutral.border} shadow-inner`}>
            <User className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{employee.name}</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{employee.employee_id} • {employee.designation}</p>
          </div>
        </div>

        {/* Month Picker */}
        <div className={`flex items-center gap-2 bg-white rounded-xl shadow-sm border ${colors.neutral.border} p-2 mb-4`}>
          <CalendarIcon className={`w-5 h-5 ${moduleTheme.attendance.text} ml-2 shrink-0`} />
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-900 font-bold focus:ring-0 p-2"
          />
        </div>

        {/* Monthly Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 text-center shadow-sm flex flex-col justify-center items-center`}>
            <span className="text-xs font-bold text-green-600 mb-0.5">Present</span>
            <span className="text-lg font-black text-slate-900">{stats.present}</span>
          </div>
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 text-center shadow-sm flex flex-col justify-center items-center`}>
            <span className="text-xs font-bold text-red-600 mb-0.5">Absent</span>
            <span className="text-lg font-black text-slate-900">{stats.absent}</span>
          </div>
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 text-center shadow-sm flex flex-col justify-center items-center`}>
            <span className="text-xs font-bold text-yellow-600 mb-0.5">Half Day</span>
            <span className="text-lg font-black text-slate-900">{stats.halfDay}</span>
          </div>
          <div className={`bg-white border ${colors.neutral.border} rounded-lg p-2 text-center shadow-sm flex flex-col justify-center items-center`}>
            <span className={`text-xs font-bold ${moduleTheme.attendance.text} mb-0.5`}>Leave</span>
            <span className="text-lg font-black text-slate-900">{stats.leave}</span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="px-4 sm:px-6 pt-4">
        {attendanceRecords.length === 0 ? (
          <div className={`bg-white rounded-xl p-8 text-center border ${colors.neutral.border} shadow-sm mt-4`}>
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No records found for this month.</p>
          </div>
        ) : (
          <div className={`bg-white rounded-xl border ${colors.neutral.border} shadow-sm overflow-hidden divide-y divide-slate-100`}>
            {attendanceRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4">
                <span className="text-sm font-bold text-slate-700">
                  {formatDate(record.date)}
                </span>
                
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' : 
                  record.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' :
                  record.status === 'Half Day' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    record.status === 'Present' ? 'bg-green-500' : 
                    record.status === 'Absent' ? 'bg-red-500' :
                    record.status === 'Half Day' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></span>
                  {record.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
