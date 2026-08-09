import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { moduleTheme, radius, animations } from '../../theme';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface PrimaryActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme: keyof typeof moduleTheme;
  icon?: LucideIcon;
  loading?: boolean;
}

export function PrimaryActionButton({ 
  theme, 
  icon: Icon, 
  loading, 
  disabled, 
  children, 
  className,
  ...props 
}: PrimaryActionButtonProps) {
  const currentTheme = moduleTheme[theme];

  return (
    <Button
      className={cn(
        `w-full text-white font-bold h-14 ${radius['2xl']} shadow-md text-lg ${animations.tap}`,
        currentTheme.bg,
        currentTheme.bgHover,
        currentTheme.shadow,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : Icon ? (
        <Icon className="w-5 h-5 mr-2" />
      ) : null}
      {children}
    </Button>
  );
}
