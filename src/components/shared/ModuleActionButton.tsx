import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { animations } from '../../theme';

interface ModuleActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  label: string;
  variant?: 'primary' | 'secondary' | 'glass';
  loading?: boolean;
}

export function ModuleActionButton({
  icon: Icon,
  label,
  variant = 'glass',
  loading,
  className,
  disabled,
  ...props
}: ModuleActionButtonProps) {
  
  const baseStyles = `flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm ${animations.tap} whitespace-nowrap w-full sm:w-auto`;
  
  const variants = {
    primary: "bg-white text-slate-900 hover:bg-slate-50 shadow-sm",
    secondary: "bg-transparent text-white border-2 border-white/40 hover:bg-white/10",
    glass: "bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {label}
    </button>
  );
}
