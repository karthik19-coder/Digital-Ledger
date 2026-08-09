import React from 'react';
import { LucideIcon } from 'lucide-react';
import { moduleTheme, colors, typography, shadow, radius, animations } from '../../theme';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';

interface SummaryCardProps {
  theme?: keyof typeof moduleTheme;
  title: string;
  amount: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  action?: React.ReactNode;
  className?: string;
  isCurrency?: boolean;
}

export function SummaryCard({ theme, title, amount, icon: Icon, subtitle, onClick, action, className, isCurrency = true }: SummaryCardProps) {
  const currentTheme = theme ? moduleTheme[theme] : null;
  const Wrapper = onClick ? 'button' : 'div';
  
  return (
    <Card 
      className={cn(
        "border overflow-hidden relative group h-full bg-white",
        shadow.soft,
        radius['2xl'],
        onClick ? `cursor-pointer w-full text-left ${animations.buttonHover}` : "transition-all duration-150",
        currentTheme ? currentTheme.border : colors.neutral.border,
        className
      )}
    >
      {onClick && <Wrapper onClick={onClick} className="absolute inset-0 z-0" aria-label={`View ${title}`} />}
      <CardContent className="p-4 sm:p-5 relative z-10 pointer-events-none flex flex-col h-full min-w-0">
        <div className="flex justify-between items-start mb-3 min-w-0">
          <div className={cn(
            "p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 transition-colors",
            currentTheme ? currentTheme.bgLight : colors.neutral.bg,
            currentTheme ? currentTheme.text : colors.neutral.text
          )}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          {action && (
            <div className="relative z-20 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className={cn("text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1 truncate", typography.Caption)}>
            {title}
          </p>
          <h3 className={cn(typography.AmountLG, "text-slate-900 truncate")}>
            {typeof amount === 'number' 
              ? (isCurrency ? formatCurrency(amount) : amount.toString())
              : amount}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium truncate">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
