import React from 'react';
import { typography } from '../../theme';
import { cn } from '../../lib/utils';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  onViewAll?: () => void;
  className?: string;
}

export function SectionHeader({ title, action, onViewAll, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex justify-between items-center mb-4 sm:mb-6", className)}>
      <h2 className={cn("text-slate-900", typography.SubHeading)}>{title}</h2>
      
      <div className="flex items-center gap-3">
        {action}
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
