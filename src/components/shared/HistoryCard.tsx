import React from 'react';
import { LucideIcon } from 'lucide-react';
import { moduleTheme, colors, animations, radius } from '../../theme';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';

interface HistoryCardProps {
  theme?: keyof typeof moduleTheme;
  title: string;
  subtitle: string;
  amount: number;
  type: 'credit' | 'debit' | 'neutral';
  icon: LucideIcon;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function HistoryCard({ 
  theme, 
  title, 
  subtitle, 
  amount, 
  type, 
  icon: Icon, 
  badge, 
  onClick,
  className 
}: HistoryCardProps) {
  const currentTheme = theme ? moduleTheme[theme] : null;

  return (
    <div 
      onClick={onClick}
      className={cn(
        `bg-white ${radius.xl} p-4 sm:p-5 flex items-center justify-between shadow-sm border ${animations.cardFade}`,
        onClick ? `cursor-pointer ${animations.listHover} border-transparent hover:border-slate-200` : "border-slate-100",
        className
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
          currentTheme ? currentTheme.bgLight : colors.neutral.bg,
          currentTheme ? currentTheme.text : colors.neutral.text
        )}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate mb-0.5">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <span className={cn(
          "font-bold text-sm sm:text-base whitespace-nowrap",
          type === 'credit' ? colors.success.text : type === 'debit' ? colors.error.text : "text-slate-900"
        )}>
          {type === 'credit' ? '+' : type === 'debit' ? '-' : ''}
          {formatCurrency(amount)}
        </span>
        {badge}
      </div>
    </div>
  );
}
