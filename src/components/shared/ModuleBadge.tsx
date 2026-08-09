import React from 'react';
import { moduleTheme } from '../../theme';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface ModuleBadgeProps {
  theme?: keyof typeof moduleTheme;
  color?: 'green' | 'orange' | 'red' | 'purple' | 'blue' | 'slate' | 'emerald';
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export function ModuleBadge({ theme, color, label, icon: Icon, className }: ModuleBadgeProps) {
  let bgClass = '';
  let textClass = '';
  let borderClass = '';

  if (theme) {
    const currentTheme = moduleTheme[theme];
    bgClass = currentTheme.bgLight;
    textClass = currentTheme.text;
    borderClass = currentTheme.border;
  } else if (color) {
    bgClass = `bg-${color}-50`;
    textClass = `text-${color}-700`;
    borderClass = `border-${color}-200`;
  } else {
    bgClass = 'bg-slate-50';
    textClass = 'text-slate-700';
    borderClass = 'border-slate-200';
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
      bgClass,
      textClass,
      borderClass,
      className
    )}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}
