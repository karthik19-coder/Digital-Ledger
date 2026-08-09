import React from 'react';
import { typography, radius, shadow } from '../../theme';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/currency';

interface HeaderSummaryCardProps {
  title: string;
  amount: number | string;
  subtitle?: string;
  className?: string;
  isCurrency?: boolean;
}

export function HeaderSummaryCard({ title, amount, subtitle, className, isCurrency = true }: HeaderSummaryCardProps) {
  return (
    <div className={cn(
      `bg-white/10 backdrop-blur-md ${radius['2xl']} p-4 sm:p-5 border border-white/20 ${shadow.soft} relative overflow-hidden group`,
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1">
          {title}
        </p>
        <h2 className={`text-white ${typography.AmountXL}`}>
          {typeof amount === 'number' ? (isCurrency ? formatCurrency(amount) : amount) : amount}
        </h2>
        {subtitle && (
          <p className="text-white/70 text-xs mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
