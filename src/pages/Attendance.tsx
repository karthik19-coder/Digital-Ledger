import { useState, useEffect, useMemo, useCallback } from 'react';

import { useSmartBack } from '../hooks/useSmartBack';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Loader2, User, CheckCircle2, XCircle, Clock3, CalendarMinus
} from 'lucide-react';
import { format } from 'date-fns';
import { employeeService, Employee } from '../services/employee.service';
import { attendanceService, AttendanceStatus } from '../services/attendance.service';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  EmptyState,
  FinancialCard,
  SectionHeader,
  PrimaryActionButton,
  HistoryCard,
  BusinessDateNavigator
} from '../components/shared';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';


import { useQueryCache } from '../hooks/useQueryCache';

interface EmployeeAttendanceRow extends Employee {
  currentStatus: AttendanceStatus | null;
}

export default function Attendance() {
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  
  const { selectedDate, setSelectedDate, previousDay, nextDay, isToday } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const cacheKey = `attendance-${dateStr}`;

  const fetchData = async () => {
    // Load active employees only (and joined on or before selected date)
    const allEmps = await employeeService.getEmployees(false);
    const activeEmps = allEmps.filter(e => e.status === 'Active' && !e.archived && e.joining_date <= dateStr);

    // Load attendance for the date
    const records = await attendanceService.getAttendance(dateStr);
    
    const attMap: Record<string, AttendanceStatus> = {};
    records.forEach(r => {
      attMap[r.employee_id] = r.status;
    });

    return { employees: activeEmps, attendanceData: attMap };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadData, setData } = useQueryCache(
    cacheKey,
    fetchData,
    [selectedDate]
  );

  const employees = cachedRes?.employees || [];
  const attendanceData = cachedRes?.attendanceData || {};

  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('business-date-changed', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('business-date-changed', handleRefresh);
    };
  }, [loadData]);

  const handleStatusChange = async (employeeId: string, status: AttendanceStatus) => {
    // Optimistic UI update
    setData({
      employees,
      attendanceData: {
        ...attendanceData,
        [employeeId]: status
      }
    });

    try {
      await attendanceService.saveAttendance(employeeId, dateStr, status);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      // Revert if failed
      loadData();
    }
  };

  // Build the combined list strictly from records, no placeholders
  const attendanceRows: EmployeeAttendanceRow[] = useMemo(() => {
    return employees.map(emp => ({
      ...emp,
      currentStatus: attendanceData[emp.id] || null
    }));
  }, [employees, attendanceData]);

  // Calculate stats
  const stats = useMemo(() => {
    let present = 0, absent = 0, halfDay = 0, leave = 0;
    attendanceRows.forEach(row => {
      if (row.currentStatus === 'Present') present++;
      if (row.currentStatus === 'Absent') absent++;
      if (row.currentStatus === 'Half Day') halfDay++;
      if (row.currentStatus === 'Leave') leave++;
    });
    const totalMarked = present + absent + halfDay + leave;
    return { present, absent, halfDay, leave, totalMarked, totalEmployees: attendanceRows.length };
  }, [attendanceRows]);

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Header Banner */}
      <AppHeaderBanner
        theme="attendance"
        title="Attendance"
        subtitle="Mark daily employee attendance"
        icon={CalendarIcon}
        onBack={() => smartBack('/expenses/employees')}
        rightAction={
          <BusinessDateNavigator
            selectedDate={selectedDate}
            onPrevious={previousDay}
            onNext={nextDay}
            onDateChange={setSelectedDate}
            disableNext={isToday}
          />
        }
      >
        <div className="w-full mt-2">
          {/* Main Number */}
          <div className="flex flex-col items-center justify-center py-4 mb-4">
            <span className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
              ATTENDANCE TODAY
            </span>
            <div className="text-[56px] sm:text-[64px] leading-none font-bold text-white mb-2">
              {stats.totalMarked} <span className="text-white/50 text-4xl sm:text-5xl font-medium">/ {stats.totalEmployees}</span>
            </div>
            <span className="text-white/80 text-sm font-medium">
              Present Employees
            </span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-1 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-1">Present</span>
              <span className="text-white font-bold text-base">{stats.present}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-1">Absent</span>
              <span className="text-white font-bold text-base">{stats.absent}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-1">Half Day</span>
              <span className="text-white font-bold text-base">{stats.halfDay}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-1">Leave</span>
              <span className="text-white font-bold text-base">{stats.leave}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-1">Total</span>
              <span className="text-white font-bold text-base">{stats.totalMarked}</span>
            </div>
          </div>
        </div>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 mt-6">
        {attendanceRows.length === 0 ? (
          <EmptyState 
            icon={User}
            title="No Employees Found"
            subtitle="Please add employees to mark attendance."
          />
        ) : (
          attendanceRows.map(row => (
            <FinancialCard
              key={row.id}
              title={row.name}
              subtitle={row.designation}
              icon={User}
              theme="attendance"
              className="flex flex-col"
            >
              {/* Attendance Chips */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 px-4 pb-4">
                {/* Present Chip */}
                <button
                  onClick={(e) => { if (requirePermission(e)) handleStatusChange(row.id, 'Present'); }}
                  className={cn(`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-1 justify-center ${
                    row.currentStatus === 'Present'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Present
                </button>

                {/* Absent Chip */}
                <button
                  onClick={(e) => { if (requirePermission(e)) handleStatusChange(row.id, 'Absent'); }}
                  className={cn(`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-1 justify-center ${
                    row.currentStatus === 'Absent'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Absent
                </button>

                {/* Half Day Chip */}
                <button
                  onClick={(e) => { if (requirePermission(e)) handleStatusChange(row.id, 'Half Day'); }}
                  className={cn(`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-1 justify-center ${
                    row.currentStatus === 'Half Day'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  Half Day
                </button>

                {/* Leave Chip */}
                <button
                  onClick={(e) => { if (requirePermission(e)) handleStatusChange(row.id, 'Leave'); }}
                  className={cn(`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-1 justify-center ${
                    row.currentStatus === 'Leave'
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <CalendarMinus className="w-3.5 h-3.5" />
                  Leave
                </button>
              </div>
            </FinancialCard>
          ))
        )}
      </div>
    </div>
  );
}
