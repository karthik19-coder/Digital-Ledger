import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  IndianRupee, 
  Users, 
  Box, 
  ReceiptText, 
  Moon, 
  Landmark, 
  Settings2, 
  Store, 
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { settingsService } from '../../services/settings.service';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  matcher: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', path: '/', matcher: (p) => p === '/' },
  { icon: IndianRupee, label: 'Daily Sales', path: '/sales', matcher: (p) => p.startsWith('/sales') },
  { icon: Users, label: 'Customer Credit', path: '/credit/customers', matcher: (p) => p.startsWith('/credit') },
  { icon: Box, label: 'Stock & Inventory', path: '/stock', matcher: (p) => p.startsWith('/stock') },
  { icon: ReceiptText, label: 'Expenses', path: '/expenses', matcher: (p) => p.startsWith('/expenses') },
  { icon: Moon, label: 'Daily Closing', path: '/daily-closing', matcher: (p) => p.startsWith('/daily-closing') },
  { icon: Landmark, label: 'Business Funds', path: '/business-funds', matcher: (p) => p.startsWith('/business-funds') },
  { icon: Settings2, label: 'Settings', path: '/settings', matcher: (p) => p.startsWith('/settings') },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isOwner } = usePermissions();
  const [shopName, setShopName] = useState<string>('Supermarket');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    settingsService.getSettings().then((s) => {
      if (s.shop_name) {
        setShopName(s.shop_name);
      }
    }).catch(() => {
      // Fallback is already set
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const roleLabel = isOwner() ? 'Store Owner' : 'Staff Viewer';

  return (
    <>
      <aside 
        className={cn(
          "w-64 bg-white border-r border-[#EEF2F7] flex flex-col justify-between h-screen sticky top-0 shrink-0 z-40 select-none shadow-[2px_0_12px_rgba(15,23,42,0.02)]",
          className
        )}
        aria-label="Desktop Sidebar"
      >
        {/* Brand / Store Header */}
        <div className="p-5 border-b border-[#EEF2F7] flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 text-sm truncate leading-tight" title={shopName}>
              {shopName}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5">
              Digital Ledger
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.matcher(location.pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-blue-50 text-[#2563EB] font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Icon 
                  className={cn(
                    "w-4.5 h-4.5 shrink-0 transition-colors",
                    isActive ? "text-[#2563EB]" : "text-slate-400 group-hover:text-slate-600"
                  )} 
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile / Bottom Card */}
        <div className="p-3 border-t border-[#EEF2F7] shrink-0 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-[#EEF2F7] shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate" title={displayName}>
                  {displayName}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate">
                  {isOwner() ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                  <span>{roleLabel}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              aria-label="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        description="Are you sure you want to log out of your session?"
        confirmText="Log Out"
        cancelText="Cancel"
        variant="danger"
        loading={isLoggingOut}
      />
    </>
  );
}
