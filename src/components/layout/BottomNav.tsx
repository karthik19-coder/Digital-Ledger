import { Link, useLocation } from 'react-router-dom';
import { Home, IndianRupee, Users, Box, ReceiptText } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: IndianRupee, label: 'Sales', path: '/sales' },
  { icon: Users, label: 'Credit', path: '/credit/customers' },
  { icon: Box, label: 'Stock', path: '/stock' },
  { icon: ReceiptText, label: 'Expenses', path: '/expenses' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEF2F7] pb-safe z-50">
      <div className="flex justify-around items-center h-16 w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
                isActive ? "text-[#2563EB] font-medium" : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
