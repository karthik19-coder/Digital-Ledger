import React from 'react';
import { LucideIcon, Edit, Trash2 } from 'lucide-react';
import { moduleTheme, colors, animations } from '../../theme';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';

interface FinancialCardProps {
  theme?: keyof typeof moduleTheme;
  title: string;
  subtitle?: string;
  amount?: number | string;
  amountColor?: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

import { usePermissions } from '../../hooks/usePermissions';

export function FinancialCard({ 
  theme, 
  title, 
  subtitle, 
  amount, 
  amountColor,
  icon: Icon, 
  badge, 
  onClick,
  onEdit,
  onDelete,
  className,
  children
}: FinancialCardProps) {
  const currentTheme = theme ? moduleTheme[theme] : null;
  const { isOwner, requirePermission } = usePermissions();

  return (
    <div 
      onClick={onClick}
      className={cn(
        `bg-white rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col ${animations.cardFade}`,
        onClick ? `cursor-pointer ${animations.listHover} hover:border-slate-200` : "",
        className
      )}
    >
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Left Side: Icon + Title & Subtitle */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
            currentTheme ? currentTheme.bgLight : colors.neutral.bg,
            currentTheme ? currentTheme.text : colors.neutral.text
          )}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate mb-0.5" title={title}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Amount, Badge, and Action Buttons (flex flow, no overlap) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {(amount !== undefined || badge) && (
            <div className="text-right flex flex-col items-end gap-1">
              {amount !== undefined && (
                <span className={cn(
                  "font-bold text-sm sm:text-base whitespace-nowrap",
                  amountColor || "text-slate-900"
                )}>
                  {typeof amount === 'number' 
                    ? formatCurrency(amount)
                    : amount}
                </span>
              )}
              {badge}
            </div>
          )}

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (requirePermission(e)) onEdit(e);
                  }}
                  title="Edit"
                  aria-label="Edit"
                  className={cn(`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${colors.neutral.text} hover:bg-slate-100 active:bg-slate-200`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (requirePermission(e)) onDelete(e);
                  }}
                  title="Delete"
                  aria-label="Delete"
                  className={cn(`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100`, !isOwner() && "opacity-50 cursor-not-allowed")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
}
