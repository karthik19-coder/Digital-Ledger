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
      <div className="p-5 flex items-start justify-between w-full relative">
        {(onEdit || onDelete) && (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (requirePermission(e)) onEdit(e);
                }}
                className={cn(`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${colors.neutral.text} hover:bg-slate-100 active:bg-slate-200`, !isOwner() && "opacity-50 cursor-not-allowed")}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (requirePermission(e)) onDelete(e);
                }}
                className={cn(`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100`, !isOwner() && "opacity-50 cursor-not-allowed")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-12">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
            currentTheme ? currentTheme.bgLight : colors.neutral.bg,
            currentTheme ? currentTheme.text : colors.neutral.text
          )}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-slate-900 text-base truncate mb-0.5">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-slate-500 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1.5 mt-8 sm:mt-0">
          {amount !== undefined && (
            <span className={cn(
              "font-bold text-base",
              amountColor || "text-slate-900"
            )}>
              {typeof amount === 'number' 
                ? formatCurrency(amount)
                : amount}
            </span>
          )}
          {badge}
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
