import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, subDays, addDays, isToday, isFuture } from 'date-fns';
import { dashboardService, DashboardSummary } from '../services/dashboard.service';
import { closingService } from '../services/closing.service';
import { DashboardData } from '../types/dashboard';
import { useBusinessDate } from '../hooks/useBusinessDate';
import { 
  Store,
  LogOut,
  IndianRupee, 
  Wallet, 
  CreditCard, 
  Users, 
  Truck, 
  Package, 
  ReceiptText, 
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  X,
  Moon,
  Lock,
  Unlock,
  AlertTriangle,
  CalendarDays,
  BadgeIndianRupee,
  Landmark,
  ShoppingCart,
  BarChart3,
  MoreHorizontal,
  UserPlus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddBusinessFundsModal } from '../components/AddBusinessFundsModal';
import { BalanceBreakdownModal } from '../components/BalanceBreakdownModal';
import { CustomerDueBreakdownModal } from '../components/CustomerDueBreakdownModal';
import { VendorDueBreakdownModal } from '../components/VendorDueBreakdownModal';
import { StockValueBreakdownModal } from '../components/StockValueBreakdownModal';
import { cn } from '../lib/utils';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';
import { BusinessDateNavigator } from '../components/shared';

import { useModalNavigation } from '../hooks/useModalNavigation';
import { useQueryCache } from '../hooks/useQueryCache';
import { useCachedState } from '../hooks/useCachedState';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const { selectedDate, setSelectedDate, previousDay, nextDay, isToday: isBusinessDateToday } = useBusinessDate();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const cacheKey = `dashboard-${dateStr}`;

  const fetchDashboardData = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [data, closing, pending] = await Promise.all([
      dashboardService.getDashboardData(dateStr),
      closingService.getClosingForDate(dateStr),
      closingService.getPendingPreviousDay(todayStr)
    ]);
    return { data, summary: data.summary, closing, pending };
  };

  const { data: cachedRes, loading, error, mutate } = useQueryCache(
    cacheKey,
    fetchDashboardData,
    [selectedDate]
  );

  const data = cachedRes?.data || null;
  const summary = cachedRes?.summary || null;
  const closingStatus = cachedRes?.closing?.status || 'Open';
  const closedAt = cachedRes?.closing?.closedAt || null;
  const pendingDay = cachedRes?.pending || null;

  const [refreshing, setRefreshing] = useState(false);
  const { isOpen: showCreditActionModal, openModal: openCreditActionModal, closeModal: closeCreditActionModal } = useModalNavigation('dashboard-credit-modal');
  const { isOpen: showAddExpenseModal, openModal: openAddExpenseModal, closeModal: closeAddExpenseModal } = useModalNavigation('dashboard-expense-modal');
  const { isOpen: showAddBusinessFundsModal, openModal: openAddBusinessFundsModal, closeModal: closeAddBusinessFundsModal } = useModalNavigation('dashboard-funds-modal');
  
  const [balanceBreakdownType, setBalanceBreakdownType] = useState<'cash' | 'upi' | null>(null);
  
  // Custom confirmation state
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const { isOpen: isBalanceBreakdownOpen, openModal: openBalanceBreakdown, closeModal: closeBalanceBreakdown } = useModalNavigation('dashboard-balance-modal');
  
  const { isOpen: showCustomerDueBreakdown, openModal: openCustomerDueBreakdown, closeModal: closeCustomerDueBreakdown } = useModalNavigation('dashboard-customer-modal');
  const { isOpen: showVendorDueBreakdown, openModal: openVendorDueBreakdown, closeModal: closeVendorDueBreakdown } = useModalNavigation('dashboard-vendor-modal');
  const { isOpen: showStockValueBreakdown, openModal: openStockValueBreakdown, closeModal: closeStockValueBreakdown } = useModalNavigation('dashboard-stock-modal');
  
  const [showPendingOverlay, setShowPendingOverlay] = useCachedState('dashboard-pending-overlay', false);
  const [hasCheckedPending, setHasCheckedPending] = useCachedState('dashboard-has-checked-pending', false);
  
  const { signOut } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout failed:', e);
      setIsLoggingOut(false);
    }
  };
  
  const navigate = useNavigate();
  const { isOwner, requirePermission } = usePermissions();

  useEffect(() => {
    if (pendingDay && !hasCheckedPending) {
      setShowPendingOverlay(true);
      setHasCheckedPending(true);
    } else if (!pendingDay) {
      setShowPendingOverlay(false);
    }
  }, [pendingDay, hasCheckedPending, setHasCheckedPending, setShowPendingOverlay]);

  useEffect(() => {
    const handleRefresh = () => {
      mutate();
    };
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [mutate]);

  useEffect(() => {
    const handleFinancialDataUpdated = () => {
      mutate();
    };
    window.addEventListener('financial-data-updated', handleFinancialDataUpdated);
    return () => {
      window.removeEventListener('financial-data-updated', handleFinancialDataUpdated);
    };
  }, [mutate]);

  const handleRefreshClick = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };


  const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const setBalanceBreakdown = (type: 'cash' | 'upi' | null) => {
    setBalanceBreakdownType(type);
    if (type) openBalanceBreakdown();
    else closeBalanceBreakdown();
  };

  if (showPendingOverlay && pendingDay) {
    const formattedPending = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(pendingDay));

    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <Moon className="w-16 h-16 text-blue-400 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Previous Business Day Not Closed</h2>
        <p className="text-slate-300 mb-8 max-w-sm">
          The business day <span className="font-semibold text-white">{formattedPending}</span> has not been closed. Please complete Daily Closing before continuing.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            size="lg" 
            className={`w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow-md`}
            onClick={() => {
              setSelectedDate(new Date(pendingDay));
              navigate('/daily-closing');
            }}
          >
            🌙 Close Previous Day
          </Button>
          <Button 
            size="lg" 
            variant="ghost" 
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setShowPendingOverlay(false)}
          >
            Continue Without Closing
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-4 text-center">
        <Store className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-medium text-[#0F172A] mb-2">Error</h2>
        <p className="text-slate-500 mb-6">{error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)}</p>
        <Button onClick={handleRefreshClick} variant="outline">Try Again</Button>
      </div>
    );
  }

  if (!data || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-4 text-center">
        <Store className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-medium text-[#0F172A] mb-2">No Data Available</h2>
        <p className="text-slate-500 mb-6">No dashboard data found.</p>
        <Button onClick={handleRefreshClick} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen bg-[#F8FAFC]`}>
      <div className="h-0 overflow-hidden flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium transition-all duration-300">
        Pull down to refresh
      </div>

      <div className="p-4 sm:p-6 lg:p-8 pb-28 lg:pb-12 max-w-[600px] lg:max-w-7xl mx-auto w-full flex flex-col gap-5 lg:gap-6">
        
        {/* Header */}
        <header className="bg-white rounded-[22px] p-5 sm:p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)] border border-[#EEF2F7] relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2 lg:mb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[16px] bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-tight truncate">
                    {data.shop_name}
                  </h1>
                  <p className="text-xs text-[#475569] font-medium tracking-wide">
                    Unified Financial Management
                  </p>
                </div>
              </div>

              {/* Right controls: Date navigator and action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <div className="bg-white border border-[#E5E7EB] rounded-full p-1.5 flex items-center justify-between shadow-[0_8px_20px_rgba(15,23,42,0.06)] min-w-[260px] sm:min-w-[280px]">
                  <button 
                    onClick={previousDay}
                    aria-label="Previous day"
                    className="w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-[#475569] hover:text-[#1E293B] transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#475569]" />
                    <span className="text-sm font-semibold text-[#1E293B] tracking-wide">
                      {formatDateDisplay(selectedDate)}
                    </span>
                  </div>
                  <button 
                    onClick={nextDay}
                    disabled={isBusinessDateToday}
                    aria-label="Next day"
                    className="w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-[#475569] hover:text-[#1E293B] transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={handleRefreshClick}
                    disabled={!isToday(selectedDate)}
                    className="w-10 h-10 rounded-full bg-white border border-[#EEF2F7] text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Refresh dashboard"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setIsLogoutModalOpen(true)}
                    title="Logout"
                    className="w-10 h-10 rounded-full bg-white border border-[#EEF2F7] text-red-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition-all flex items-center justify-center shrink-0"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Pending Day Banner */}
            {pendingDay && !showPendingOverlay && (
              <div className="mt-4 bg-orange-500/10 backdrop-blur-md border border-orange-500/20 rounded-2xl p-3 sm:p-4 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex gap-2.5 items-start sm:items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-300">⚠ Business Day Pending</h3>
                    <p className="text-xs text-orange-600/90 dark:text-orange-400/80 mt-0.5">
                      <span className="font-medium">{format(new Date(pendingDay), 'dd MMM yyyy')}</span> is still open.
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className={cn("shrink-0 bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 h-8 text-xs font-semibold rounded-xl w-full sm:w-auto", !isOwner() && "opacity-50 cursor-not-allowed")}
                  onClick={(e) => {
                    if (!requirePermission(e)) return;
                    navigate('/daily-closing?date=' + pendingDay);
                  }}
                >
                  Close Now
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-[22px] p-3 min-[375px]:p-4 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-[#EEF2F7]">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-800 mb-3 sm:mb-5 tracking-wider">QUICK ACTIONS</h3>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 min-[375px]:gap-2 sm:gap-4 gap-y-3 sm:gap-y-4">
            
            <button onClick={(e) => { if (requirePermission(e)) navigate('/stock', { state: { openAdd: true } }) }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <ShoppingCart className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Add<br/>Purchase</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) navigate('/credit/customers') }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <CreditCard className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Record<br/>Payment</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) openCreditActionModal() }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <UserPlus className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Customer<br/>Credit</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) navigate('/stock/vendors') }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Truck className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Vendor<br/>Credit</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) openAddBusinessFundsModal() }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Landmark className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Add<br/>Funds</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) openAddExpenseModal() }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <ReceiptText className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Add<br/>Expense</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) navigate('/expenses/employees/attendance') }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <CalendarDays className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Attendance</span>
            </button>
            
            <button onClick={(e) => { if (requirePermission(e)) navigate('/expenses/employees/salary') }} className={cn("flex flex-col items-center gap-1.5 sm:gap-2.5 p-1 min-[375px]:p-2 bg-white border border-[#EEF2F7] shadow-[0_6px_18px_rgba(15,23,42,0.05)] rounded-[16px] group cursor-pointer transition-transform hover:-translate-y-1", !isOwner() && "opacity-50 cursor-not-allowed")}>
              <div className="w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 sm:w-14 sm:h-14 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <BadgeIndianRupee className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] font-semibold text-slate-600 text-center leading-[1.1] sm:leading-tight">Salary</span>
            </button>
            
          </div>
        </div>

        {/* Financial Overview Grid - Responsive Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Hero Card - Today's Sales */}
          <Link to="/sales" className="block relative group transition-transform hover:scale-[1.01] duration-300 md:col-span-2 lg:col-span-2">
            <div className="bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] rounded-[22px] overflow-hidden shadow-[0_18px_45px_rgba(37,99,235,0.28)] relative p-6 sm:p-8 h-full flex flex-col justify-between">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-[0.07] pointer-events-none">
                <IndianRupee className="w-48 h-48 rotate-[-10deg] opacity-[0.08] text-white" />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-16 opacity-20 pointer-events-none">
                 <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full text-white fill-current">
                   <path d="M0,100 C50,80 100,20 150,50 C200,80 250,10 300,40 C350,70 400,20 400,20 L400,100 L0,100 Z" opacity="0.3"></path>
                   <path d="M0,100 C40,90 80,40 120,60 C160,80 200,30 250,50 C300,70 350,30 400,10 L400,100 L0,100 Z"></path>
                 </svg>
              </div>
              
              <div className="relative z-10">
                <p className="text-[rgba(255,255,255,0.8)] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Today's Sales
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2">{formatCurrency(summary.todays_sales)}</h2>
              </div>
              <div className="relative z-10 pt-4">
                <div className="w-full h-px bg-white/25 mb-3"></div>
                <p className="text-xs font-medium text-[rgba(255,255,255,0.8)] flex items-center gap-1">
                  <span>View daily sales breakdown</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Link>

          {/* Cash */}
          <div 
            onClick={() => setBalanceBreakdown('cash')}
            className="bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] border border-[#EEF2F7] relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div className="w-7 h-7 rounded-full bg-[#F8FAFC] text-[#94A3B8] flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-1">Cash</h3>
              <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{formatCurrency(summary.cash_balance)}</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-1">Collection</p>
            </div>
          </div>

          {/* UPI */}
          <div 
            onClick={() => setBalanceBreakdown('upi')}
            className="bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] border border-[#EEF2F7] relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <div className="w-7 h-7 rounded-full bg-[#F8FAFC] text-[#94A3B8] flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-1">UPI</h3>
              <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{formatCurrency(summary.upi_balance)}</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-1">Collection</p>
            </div>
          </div>

          {/* Customer Credit */}
          <div 
            onClick={openCustomerDueBreakdown}
            className="bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] border border-[#EEF2F7] relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <User className="w-4.5 h-4.5" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); if(requirePermission(e)) openCreditActionModal(); }}
                className={cn("w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors shadow-sm", !isOwner() && "opacity-50 cursor-not-allowed")}
                title="Customer Credit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-1 leading-tight">Customer Credit</h3>
              <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{formatCurrency(summary.customer_credit_outstanding)}</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-1">To Receive</p>
            </div>
          </div>

          {/* Vendor Credit */}
          <div 
            onClick={openVendorDueBreakdown}
            className="bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] border border-[#EEF2F7] relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Truck className="w-4.5 h-4.5" />
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (requirePermission(e)) navigate('/stock', { state: { openAdd: true } });
                }}
                className={cn("w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors shadow-sm", !isOwner() && "opacity-50 cursor-not-allowed")}
                title="Vendor Credit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-1 leading-tight">Vendor Credit</h3>
              <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{formatCurrency(data?.summary?.vendor_credit_outstanding || 0)}</p>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-1">To Pay</p>
            </div>
          </div>

          {/* Estimated Stock Value - Spans 2 cols on desktop */}
          <div 
            onClick={openStockValueBreakdown}
            className="col-span-1 md:col-span-2 lg:col-span-2 bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] border border-[#EEF2F7] relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgb(0,0,0,0.05)] flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-0.5">Estimated Stock Value</h3>
                <p className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">{formatCurrency(data.summary.estimated_stock_value)}</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#F8FAFC] text-[#94A3B8] flex items-center justify-center group-hover:bg-slate-200 transition-colors shrink-0">
              <ChevronRight className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* Daily Closing - Full width across 4 cols on desktop */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 group">
            <div className="bg-slate-900 rounded-[24px] overflow-hidden shadow-lg shadow-slate-900/10 border-0 relative p-5 sm:p-6 transition-transform hover:-translate-y-1 duration-300">
              <div className="absolute right-0 bottom-0 p-4 opacity-10 pointer-events-none">
                <Moon className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
                      <Moon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Daily Closing</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-slate-300 text-sm bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                    <div className="flex justify-between sm:block">
                      <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 sm:block">Status</span>
                      <span className="flex items-center gap-1.5 font-semibold text-white text-right sm:text-left">
                        {closingStatus === 'Open' && <><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Open</>}
                        {closingStatus === 'Unlocked' && <><Unlock className="w-3.5 h-3.5 text-orange-400" /> <span className="text-orange-400">Unlocked</span></>}
                        {closingStatus === 'Closed' && <><Lock className="w-3.5 h-3.5 text-blue-400" /> Closed</>}
                      </span>
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-white/20"></div>
                    <div className="flex justify-between sm:block border-t border-white/10 pt-2 sm:border-0 sm:pt-0">
                      <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 sm:block">Business Date</span>
                      <span className="font-semibold text-white text-right sm:text-left">{formatDateDisplay(selectedDate)}</span>
                    </div>
                    {closingStatus === 'Closed' && closedAt && (
                      <>
                        <div className="hidden sm:block h-8 w-px bg-white/20"></div>
                        <div className="flex justify-between sm:block border-t border-white/10 pt-2 sm:border-0 sm:pt-0">
                          <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 sm:block">Closed At</span>
                          <span className="font-semibold text-white text-right sm:text-left">{format(new Date(closedAt), 'hh:mm a')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 z-20 w-full sm:w-auto">
                  {closingStatus === 'Closed' ? (
                    <Button 
                      onClick={(e) => {
                        if (!requirePermission(e)) return;
                        setShowUnlockConfirm(true);
                      }}
                      className={cn("w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl font-semibold h-11 shadow-sm transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
                    >
                      Unlock Day
                    </Button>
                  ) : (
                    <Button 
                      onClick={(e) => {
                        if (!requirePermission(e)) return;
                        navigate('/daily-closing?date=' + format(selectedDate, 'yyyy-MM-dd'));
                      }}
                      className={cn("w-full sm:w-auto bg-white text-[#0F172A] hover:bg-slate-100 shadow-md font-bold rounded-xl h-11 transition-all hover:scale-105", !isOwner() && "opacity-50 cursor-not-allowed")}
                    >
                      {closingStatus === 'Unlocked' ? 'Close Day Again' : "Close Today's Business"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Overlays preserved unchanged */}
      {showCreditActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeCreditActionModal}>
          <div 
            className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-3xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Customer Credit</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Choose how you'd like to continue.</p>
              </div>
              <button 
                onClick={closeCreditActionModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition-colors bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 space-y-3 flex-1 overflow-y-auto min-h-0">
              <button
                className="w-full text-left p-4 rounded-[20px] border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-start gap-4 group"
                onClick={() => {
                  navigate('/credit/customers', { replace: true });
                }}
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <div className="mt-1">
                  <h3 className="font-bold text-[#0F172A] group-hover:text-orange-700 transition-colors">Existing Customer</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Record credit for an existing customer.</p>
                </div>
              </button>

              <button
                className="w-full text-left p-4 rounded-[20px] border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-start gap-4 group"
                onClick={() => {
                  navigate('/credit', { state: { openAdd: true, autoOpenCredit: true }, replace: true });
                }}
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="mt-1">
                  <h3 className="font-bold text-[#0F172A] group-hover:text-orange-700 transition-colors">New Customer</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Create a new customer and record credit.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <AddExpenseModal 
        isOpen={showAddExpenseModal}
        onClose={closeAddExpenseModal}
        onSuccess={() => {
          closeAddExpenseModal();
          mutate();
        }}
      />
      <AddBusinessFundsModal 
        isOpen={showAddBusinessFundsModal}
        onClose={closeAddBusinessFundsModal}
      />
      {balanceBreakdownType && (
        <BalanceBreakdownModal 
          isOpen={isBalanceBreakdownOpen}
          onClose={() => setBalanceBreakdownType(null)}
          type={balanceBreakdownType || 'cash'}
          
        />
      )}
      <ConfirmDialog
        isOpen={showUnlockConfirm}
        onClose={() => setShowUnlockConfirm(false)}
        title="Unlock Daily Closing?"
        description="You are about to reopen this business day. You will be able to edit Sales, Expenses, Customer Credit, and Vendor Payments. Please close the day again after making changes."
        confirmText="Unlock Day"
        destructive={true}
        onConfirm={async () => {
          await closingService.unlockDay(format(selectedDate, 'yyyy-MM-dd'));
          window.dispatchEvent(new Event('dashboard-refresh'));
        }}
      />
      <CustomerDueBreakdownModal
        isOpen={showCustomerDueBreakdown}
        onClose={closeCustomerDueBreakdown}
      />
      <VendorDueBreakdownModal
        isOpen={showVendorDueBreakdown}
        onClose={closeVendorDueBreakdown}
      />
      <StockValueBreakdownModal
        isOpen={showStockValueBreakdown}
        onClose={closeStockValueBreakdown}
      />

      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Logout"
        description="Are you sure you want to sign out?"
        onConfirm={handleLogout}
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        loading={isLoggingOut}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] p-4 sm:p-6 space-y-5 pb-24 max-w-3xl mx-auto w-full">
      <Skeleton className="h-40 w-full rounded-[32px] bg-slate-200" />
      <Skeleton className="h-[240px] w-full rounded-[24px] bg-slate-200" />
      <Skeleton className="h-[140px] w-full rounded-[24px] bg-slate-200" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[120px] w-full rounded-[24px] bg-slate-200" />
        <Skeleton className="h-[120px] w-full rounded-[24px] bg-slate-200" />
        <Skeleton className="h-[120px] w-full rounded-[24px] bg-slate-200" />
        <Skeleton className="h-[120px] w-full rounded-[24px] bg-slate-200" />
      </div>
      <Skeleton className="h-[80px] w-full rounded-[24px] bg-slate-200" />
    </div>
  );
}
