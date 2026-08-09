import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, User, Phone, Briefcase, IndianRupee, Calendar, 
  FileText, Banknote, ChevronRight, CheckCircle2, XCircle, Clock3, CalendarMinus 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { employeeService, Employee } from '../services/employee.service';
import { attendanceService, AttendanceStatus } from '../services/attendance.service';
import { payrollService } from '../services/payroll.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { useSmartBack } from '../hooks/useSmartBack';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { smartBack } = useSmartBack();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayStatus, setTodayStatus] = useState<AttendanceStatus | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedDate } = useBusinessDate();

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) return;
      try {
        const data = await employeeService.getEmployee(id);
        setEmployee(data);

        // Fetch attendance for the selected business date
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const records = await attendanceService.getEmployeeAttendance(id);
        const dateRecord = records.find(r => r.date === dateStr);
        setTodayStatus(dateRecord?.status || null);

        // Fetch payments
        const empPayments = await payrollService.getPayments(id);
        setPayments(empPayments.filter(p => p.payment_type === 'Salary Advance' || p.payment_type === 'Salary Settlement'));
      } catch (err) {
        console.error('Error loading employee:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployee();

    const handleRefresh = () => loadEmployee();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [id, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className={`${moduleTheme.salary.textLight}`}>Employee not found.</p>
        <button onClick={() => smartBack('/expenses/employees')} className="mt-4 text-blue-600 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className={`${colors.neutral.bg} min-h-screen pb-24 safe-page-pb`}>
      {/* Header */}
      <div className={`bg-white pt-4 px-4 sm:px-6 pb-4 border-b ${colors.neutral.border} sticky top-0 z-10 flex items-center gap-3`}>
        <button 
          onClick={() => smartBack('/expenses/employees')}
          className={`w-10 h-10 flex items-center justify-center rounded-full bg-white border ${colors.neutral.border} ${colors.neutral.text} hover:${colors.neutral.bg} shadow-sm shrink-0 transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{employee.name}</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {employee.designation} • {employee.employee_id}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6">
        
        {/* Employee Info Card */}
        <Card className={`shadow-sm ${colors.neutral.border} mb-6`}>
          <CardHeader className={`p-4 pb-2 border-b border-slate-100 ${colors.neutral.bg}/50`}>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border ${colors.neutral.border} ${colors.neutral.text}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{employee.name}</p>
                  <p className="text-xs text-slate-500">Full Name</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{employee.designation}</p>
                  <p className="text-xs text-slate-500">Designation</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{new Intl.NumberFormat('en-IN').format(employee.monthly_salary)} / Month</p>
                  <p className="text-xs text-slate-500">Monthly Salary</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{employee.phone || 'Not provided'}</p>
                  <p className="text-xs text-slate-500">Phone Number</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{format(parseISO(employee.joining_date), 'dd MMM yyyy')}</p>
                  <p className="text-xs text-slate-500">Joining Date</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <FileText className={`w-5 h-5 ${colors.neutral.text}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{employee.notes || 'No notes added'}</p>
                  <p className="text-xs text-slate-500">Notes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <h3 className="text-lg font-bold text-slate-900 mb-4">Attendance</h3>
        <Card className={`shadow-sm ${colors.neutral.border} mb-6`}>
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Today's Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {todayStatus === 'Present' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    {todayStatus === 'Absent' && <XCircle className="w-3.5 h-3.5 text-blue-600" />}
                    {todayStatus === 'Half Day' && <Clock3 className="w-3.5 h-3.5 text-blue-600" />}
                    {todayStatus === 'Leave' && <CalendarMinus className="w-3.5 h-3.5 text-blue-600" />}
                    {!todayStatus && <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />}
                    <span className={`text-xs font-medium ${todayStatus ? 'text-blue-700' : 'text-slate-500'}`}>
                      {todayStatus || 'Unmarked'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/expenses/employees/${id}/attendance`)}
              className={`w-full flex items-center justify-between p-4 sm:p-5 text-sm font-bold text-slate-700 hover:${colors.neutral.bg} transition-colors`}
            >
              View Attendance
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </CardContent>
        </Card>

        {/* Salary Payments Card */}
        <h3 className="text-lg font-bold text-slate-900 mb-4">Salary Payments</h3>
        <Card className={`shadow-sm ${colors.neutral.border}`}>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Banknote className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">No salary payments yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map(payment => (
                  <div key={payment.id} className={`p-4 sm:p-5 flex items-center justify-between hover:${colors.neutral.bg} transition-colors`}>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {format(parseISO(payment.payment_date), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {payment.payment_method}
                      </p>
                    </div>
                    <span className="text-base font-black text-green-600">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
