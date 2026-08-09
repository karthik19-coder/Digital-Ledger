import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { colors } from '../../theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn(`flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-dashed ${colors.neutral.border}`, className)}>
      <div className={`w-16 h-16 rounded-full ${colors.neutral.bg} flex items-center justify-center mb-4`}>
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">{subtitle}</p>
      {action}
    </div>
  );
}
