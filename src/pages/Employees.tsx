import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Phone, Loader2, IndianRupee, CheckCircle2, Archive, Briefcase, Eye, Edit2, CalendarDays, Banknote, Users } from 'lucide-react';
import { employeeService, Employee } from '../services/employee.service';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  EmptyState,
  FinancialCard,
  SegmentTabs
} from '../components/shared';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { EditEmployeeModal } from '../components/EditEmployeeModal';
import { ArchiveEmployeeModal } from '../components/ArchiveEmployeeModal';
import { usePermissions } from '../hooks/usePermissions';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { cn } from '../lib/utils';


export default function Employees() {
  const navigate = useNavigate();
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Active' | 'Archived'>('Active');
  
  const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModalNavigation('employee-add');
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModalNavigation('employee-edit');
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const { isOpen: isArchiveModalOpen, openModal: openArchiveModal, closeModal: closeArchiveModal } = useModalNavigation('employee-archive');
  const [archivingEmployee, setArchivingEmployee] = useState<Employee | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadData]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Tab filter
    if (activeTab === 'Active') {
      filtered = filtered.filter(e => !e.archived);
    } else {
      filtered = filtered.filter(e => e.archived);
    }

    // Search filter (Name, Phone, Designation)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(q) || 
        e.phone.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [employees, activeTab, searchQuery]);

  const handleRestore = async (employee: Employee) => {
    try {
      await employeeService.restoreEmployee(employee.id);
      showSuccess('Employee restored successfully');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-24 safe-page-pb">
      {/* Header Banner */}
      <AppHeaderBanner
        theme="salary"
        title="Employees & Payroll"
        subtitle="Manage your staff and their salaries"
        icon={Users}
        onBack={() => smartBack('/expenses')}
      >
        <HeaderSummaryCard 
          title="TOTAL EMPLOYEES" 
          amount={employees.filter(e => !e.archived).length} 
          isCurrency={false}
        />
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Plus} 
            label="Add Employee" 
            onClick={(e) => {
              if (!requirePermission(e)) return;
              setEditingEmployee(undefined);
              openAddModal();
            }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
          <ModuleActionButton 
            icon={CalendarDays} 
            label="Attendance" 
            onClick={() => navigate('/expenses/employees/attendance')} 
            variant="glass" 
          />
          <ModuleActionButton 
            icon={Banknote} 
            label="Salary" 
            onClick={() => navigate('/expenses/employees/salary')} 
            variant="glass" 
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6 mt-6 relative z-20 max-w-md lg:max-w-5xl mx-auto w-full">
        {/* Toast */}
        {successMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium text-sm">{successMessage}</p>
          </div>
        )}

        <SegmentTabs 
          tabs={[
            { id: 'Active', label: 'Active' },
            { id: 'Archived', label: 'Archived' }
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'Active' | 'Archived')}
        />

        {/* Employee List */}
        {filteredEmployees.length === 0 ? (
          <EmptyState 
            icon={User}
            title="No Employees Yet"
            subtitle="Add your first employee to start managing staff."
            action={
              <ModuleActionButton 
                label="Add Employee"
                icon={Plus}
                onClick={(e) => { if (requirePermission(e)) openAddModal(); }}
                variant="primary"
                className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
              />
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 mt-6">
            {filteredEmployees.map((employee) => (
              <FinancialCard
                key={employee.id}
                title={employee.name}
                subtitle={employee.phone || 'No phone'}
                amount={employee.monthly_salary}
                amountColor="text-blue-600"
                icon={User}
                theme="salary"
                onClick={() => navigate(`/expenses/employees/${employee.id}`)}
                onEdit={!employee.archived ? (e) => {
                  e.stopPropagation();
                  setEditingEmployee(employee);
                  openEditModal();
                } : undefined}
                onDelete={!employee.archived ? (e) => {
                  e.stopPropagation();
                  setArchivingEmployee(employee);
                  openArchiveModal();
                } : undefined}
                badge={
                  employee.archived ? (
                    <span className={`bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 uppercase tracking-wider shrink-0 mt-1`}>Archived</span>
                  ) : employee.status === 'Active' ? (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md border border-green-200 uppercase tracking-wider shrink-0 mt-1">Active</span>
                  ) : employee.status === 'On Leave' ? (
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md border border-orange-200 uppercase tracking-wider shrink-0 mt-1">On Leave</span>
                  ) : (
                    <span className={`bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 uppercase tracking-wider shrink-0 mt-1`}>Inactive</span>
                  )
                }
              >
                <div className="grid grid-cols-1 gap-2 px-5 pb-3 border-t border-slate-100 pt-3 rounded-b-[20px]">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-700">{employee.designation}</span>
                  </div>
                  {employee.archived && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (requirePermission(e)) handleRestore(employee); }}
                      className={cn(`flex justify-center items-center gap-1.5 py-1.5 mt-2 w-full text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors rounded-lg border border-slate-200`, !isOwner() && "opacity-50 cursor-not-allowed")}
                    >
                      <Archive className="w-4 h-4" />
                      Restore
                    </button>
                  )}
                </div>
              </FinancialCard>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSuccess={() => {
          closeAddModal();
          showSuccess('Employee added successfully');
          loadData();
        }}
      />
      
      <EditEmployeeModal
        isOpen={isEditModalOpen && !!editingEmployee}
        onClose={() => {
          setEditingEmployee(undefined);
          closeEditModal();
        }}
        employee={editingEmployee}
        onSuccess={() => {
          setEditingEmployee(undefined);
          closeEditModal();
          showSuccess('Employee updated successfully');
          loadData();
        }}
      />

      <ArchiveEmployeeModal
        isOpen={isArchiveModalOpen && !!archivingEmployee}
        onClose={() => {
          setArchivingEmployee(null);
          closeArchiveModal();
        }}
        employee={archivingEmployee}
        onSuccess={() => {
          setArchivingEmployee(null);
          closeArchiveModal();
          showSuccess('Employee archived successfully');
          loadData();
        }}
      />
    </div>
  );
}
