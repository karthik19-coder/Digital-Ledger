import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { colors } from '../../theme';

interface ModuleSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  className?: string;
}

export function ModuleSearchBar({
  placeholder = "Search...",
  className,
  ...props
}: ModuleSearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-slate-400" />
      </div>
      <input
        type="text"
        className={cn(
          `w-full h-12 pl-11 pr-4 bg-white border ${colors.neutral.border} rounded-2xl text-sm ${colors.neutral.text} placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-sm`,
        )}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
